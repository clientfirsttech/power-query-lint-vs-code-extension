"""
PQL Test Runner — Core library for discovering and executing DAX tests.

Tests live in the SemanticModel's DAXQueries/ folder as .dax files whose
names match the pattern *.Tests.dax (e.g. Calculations.DEV.Tests.dax).

Execution uses pyadomd (ADOMD.NET Python wrapper) to send DAX queries via
XMLA to either a locally-open Power BI Desktop instance or a Power BI
Premium / Fabric workspace endpoint — mirroring the Invoke-DQVTesting pattern.

Service principal authentication is supported via msal for remote XMLA
connections, which enables row-level security calls with service principals.

XMLA connection resolution priority:
  1. Remote workspace endpoint (tenant_id + workspace_id + dataset_id).
     Service principal credentials (client_id + client_secret) are used
     to acquire an OAuth2 access token via MSAL — matching the auth flow
     used by Invoke-DQVTesting for CI/CD build agents.
  2. Local Power BI Desktop (localhost:NNNNN) — detected automatically when
     a .pbip file exists in model_path and a PBIDesktop process is running.

Results are parsed from the standard 4-column PQL.Assert schema:
  [TestName], [Expected], [Actual], [Passed]
Best-practice files (BestPractices.*.Tests.dax) return a 5-column schema;
the extra RuleDescription column is surfaced automatically.

Dependencies
------------
  pyadomd  — pip install pyadomd  (requires .NET / ADOMD.NET on Windows)
  msal     — pip install msal     (required for service-principal auth)
"""

from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    from pyadomd import Pyadomd  # type: ignore[import-untyped]
    HAS_PYADOMD = True
except ImportError:
    HAS_PYADOMD = False

try:
    import msal  # type: ignore[import-untyped]
    HAS_MSAL = True
except ImportError:
    HAS_MSAL = False

try:
    import psutil as _psutil  # type: ignore[import-untyped]
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


# ---------------------------------------------------------------------------
# Public data types
# ---------------------------------------------------------------------------

@dataclass
class PqlTest:
    """A single DAX test file discovered in a PBIP model."""

    name: str
    """Test suite name derived from the file stem (e.g. 'Calculations.DEV.Tests')."""
    file_path: str
    """Absolute path to the .dax source file."""
    source: str
    """Raw DAX source."""
    description: Optional[str] = None
    """Optional description (FUNCTION name when present in the DAX source)."""


@dataclass
class TestResult:
    """Result of executing a single DAX assertion row."""

    test_name: str
    passed: bool
    message: str
    error: Optional[str] = None
    duration_ms: Optional[float] = None


@dataclass
class TestSuite:
    """Summary of a full test run against a model."""

    model_path: str
    tests: list[PqlTest]
    results: list[TestResult]
    passed: int
    failed: int
    total: int


@dataclass
class XmlaConnectionOptions:
    """
    Connection parameters for XMLA execution.

    For remote Power BI Premium / Fabric connections all three of
    tenant_id, workspace_id, and dataset_id are required.

    client_id + client_secret are used to acquire an OAuth2 bearer
    token via the MSAL service-principal (client-credentials) flow.
    This is the same authentication pattern used by Invoke-DQVTesting
    when running in CI/CD pipelines against cloud-hosted models.
    """

    tenant_id: Optional[str] = None
    workspace_id: Optional[str] = None
    dataset_id: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None


@dataclass
class ResolvedXmlaConnection:
    """Resolved XMLA server, catalog, and optional auth details."""

    server: str
    catalog: str
    tenant_id: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: Optional[str] = None


@dataclass
class LocalPbiInstance:
    """
    A Power BI Desktop instance open on the local machine.

    Mirrors the custom object returned by Invoke-DQVTesting's
    Get-PowerBIFilesOpened for each detected process.
    """

    model_name: str
    """Window title with " - Power BI Desktop" suffix stripped."""
    server: str
    """XMLA server string, e.g. "localhost:63402"."""
    catalog: str
    """Catalog name or GUID from DBSCHEMA_CATALOGS."""


# ---------------------------------------------------------------------------
# Model discovery helpers
# ---------------------------------------------------------------------------

def _find_semantic_model_dir(model_path: str) -> Optional[str]:
    """Return the .SemanticModel directory inside a PBIP model root."""
    p = Path(model_path)
    if not p.exists():
        return None
    for entry in p.iterdir():
        if entry.name.endswith(".SemanticModel") and entry.is_dir():
            return str(entry)
    return None


def _find_pbip_file(model_path: str) -> Optional[str]:
    """Return the .pbip file path inside a PBIP model root, or None."""
    p = Path(model_path)
    if not p.exists():
        return None
    for entry in p.iterdir():
        if entry.name.endswith(".pbip") and entry.is_file():
            return str(entry)
    return None


def _collect_dax_test_files(semantic_model_dir: str) -> list[str]:
    """Return all *.Tests.dax file paths from the DAXQueries/ folder."""
    dax_dir = Path(semantic_model_dir) / "DAXQueries"
    if not dax_dir.exists():
        return []
    return sorted(
        str(f) for f in dax_dir.iterdir() if f.name.endswith(".Tests.dax")
    )


def _parse_dax_test_file(file_path: str) -> PqlTest:
    """Parse a *.Tests.dax file into a PqlTest descriptor."""
    source = Path(file_path).read_text(encoding="utf-8")
    name = Path(file_path).stem  # basename without .dax extension
    func_match = re.search(r"FUNCTION\s+([\w.]+)\s*=", source, re.IGNORECASE)
    description = f"DAX function: {func_match.group(1)}" if func_match else None
    return PqlTest(name=name, file_path=file_path, source=source, description=description)


# ---------------------------------------------------------------------------
# Local Power BI Desktop detection — process-based (mirrors Invoke-DQVTesting)
# ---------------------------------------------------------------------------

def _get_pbi_process_window_titles() -> dict[int, str]:
    """
    Return {pid: window_title} for all visible Power BI Desktop windows.

    Mirrors the ``GetWindowText`` + ``EnumWindows`` approach used in
    Invoke-DQVTesting's Get-PowerBIFilesOpened to identify which
    PBIDesktop.exe processes are open and their model names.

    Windows only; returns an empty dict on other platforms.
    """
    import ctypes  # noqa: PLC0415

    titles: dict[int, str] = {}
    if not hasattr(ctypes, "windll"):
        return titles

    user32 = ctypes.windll.user32
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

    def _callback(hwnd: int, _: int) -> bool:
        if not user32.IsWindowVisible(hwnd):
            return True
        length: int = user32.GetWindowTextLengthW(hwnd) + 1
        if length <= 1:
            return True
        buf = ctypes.create_unicode_buffer(length)
        user32.GetWindowTextW(hwnd, buf, length)
        title: str = buf.value
        if "Power BI Desktop" in title:
            pid = ctypes.c_ulong(0)
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if pid.value and pid.value not in titles:
                titles[pid.value] = title
        return True

    user32.EnumWindows(WNDENUMPROC(_callback), 0)
    return titles


def _get_catalog_from_local_port(port: int) -> Optional[str]:
    """
    Query ``$SYSTEM.DBSCHEMA_CATALOGS`` on a local AS port to get the catalog
    name/GUID — the same query Invoke-DQVTesting uses after connecting to each
    msmdsrv port to identify the loaded model.

    Returns the first catalog name found, or None when pyadomd is unavailable.
    """
    if not HAS_PYADOMD:
        return None
    try:
        conn_str = f"Provider=MSOLAP;Data Source=localhost:{port};"
        with Pyadomd(conn_str) as db:
            with db.cursor().execute("select * from $SYSTEM.DBSCHEMA_CATALOGS") as cur:
                rows = cur.fetchall()
                if rows:
                    return str(rows[0][0])
    except Exception:  # noqa: BLE001
        pass
    return None


def get_pbi_files_opened() -> list[LocalPbiInstance]:
    """
    Discover all Power BI Desktop instances open on this machine.

    Mirrors Invoke-DQVTesting's ``Get-PowerBIFilesOpened``:

    1. Enumerate visible windows via ``EnumWindows`` + ``GetWindowText`` to
       find PBIDesktop.exe PIDs and model names (window title minus the
       " - Power BI Desktop" suffix).
    2. Find ``msmdsrv.exe`` processes and their LISTEN TCP ports using psutil
       (equivalent to ``Get-NetTCPConnection`` / ``Get-CimInstance Win32_Process``).
    3. Map each msmdsrv process to its parent PBIDesktop process via PPID.
    4. Query ``$SYSTEM.DBSCHEMA_CATALOGS`` on each port (via pyadomd) to
       resolve the real catalog name/GUID that Power BI Desktop loaded.

    Requires ``psutil`` (``pip install psutil``).
    """
    if not HAS_PSUTIL:
        raise ImportError(
            "psutil is required for local Power BI Desktop detection. "
            "Install with: pip install psutil"
        )

    # Step 1 — PID → window title mapping
    pid_to_raw_title = _get_pbi_process_window_titles()
    pbi_pid_to_model: dict[int, str] = {}
    for pid, title in pid_to_raw_title.items():
        idx = title.rfind(" - ")
        model_name = title[:idx].strip() if idx > 0 else title
        pbi_pid_to_model[pid] = model_name

    if not pbi_pid_to_model:
        return []

    # Step 2 & 3 — msmdsrv ports mapped back to parent PBIDesktop via PPID
    instances: list[LocalPbiInstance] = []
    for proc in _psutil.process_iter(["pid", "name", "ppid"]):
        try:
            pname = (proc.info.get("name") or "").lower()
            if pname != "msmdsrv.exe":
                continue
            parent_pid: int = proc.info.get("ppid") or 0
            model_name = pbi_pid_to_model.get(parent_pid, "")

            for conn in proc.net_connections(kind="tcp"):
                if (
                    getattr(conn, "status", None) == _psutil.CONN_LISTEN
                    and conn.laddr
                    and conn.laddr.ip in ("0.0.0.0", "::", "127.0.0.1")
                ):
                    port = conn.laddr.port
                    # Step 4 — get real catalog name/GUID
                    catalog = _get_catalog_from_local_port(port) or model_name
                    instances.append(
                        LocalPbiInstance(
                            model_name=model_name,
                            server=f"localhost:{port}",
                            catalog=catalog,
                        )
                    )
                    break
        except (_psutil.NoSuchProcess, _psutil.AccessDenied):
            continue

    return instances


def resolve_local_xmla_connection(
    model_path: str,
) -> Optional[ResolvedXmlaConnection]:
    """
    Resolve XMLA connection for a locally open Power BI Desktop model.

    Mirrors Invoke-DQVTesting's ``-Local`` switch:

    1. Calls ``get_pbi_files_opened()`` to enumerate all running PBI Desktop
       instances using process inspection + TCP port detection.
    2. Matches the detected model name (window title) against the ``.pbip``
       file stem from ``model_path`` (case-insensitive).
    3. Falls back to reading the ``msmdsrv.port.txt`` file when psutil is
       unavailable.

    Parameters
    ----------
    model_path:
        Root directory of the PBIP model.
    """
    pbip = _find_pbip_file(model_path)
    model_name = Path(pbip).stem if pbip else None

    try:
        instances = get_pbi_files_opened()
    except ImportError:
        # psutil not installed — fall back to port-file approach
        port = _detect_local_pbi_desktop_port()
        if port and model_name:
            return ResolvedXmlaConnection(server=port, catalog=model_name)
        return None

    if not instances:
        # No running PBI Desktop found via process detection; try port-file
        port_str = _detect_local_pbi_desktop_port()
        if port_str and model_name:
            return ResolvedXmlaConnection(server=port_str, catalog=model_name)
        return None

    if model_name:
        for inst in instances:
            if inst.model_name.lower() == model_name.lower():
                return ResolvedXmlaConnection(
                    server=inst.server,
                    catalog=inst.catalog,
                )
        # No name match — warn but do not guess a random model
        return None

    # No .pbip file in model_path — use the first detected instance
    inst = instances[0]
    return ResolvedXmlaConnection(server=inst.server, catalog=inst.catalog)


# ---------------------------------------------------------------------------
# Local Power BI Desktop detection — port-file fallback
# ---------------------------------------------------------------------------

def _detect_local_pbi_desktop_port() -> Optional[str]:
    """
    Detect the Analysis Services port used by an open Power BI Desktop instance.

    Power BI Desktop writes the port number to:
      %LOCALAPPDATA%\\Microsoft\\Power BI Desktop\\
          AnalysisServicesWorkspaces\\AnalysisServicesWorkspace<port>\\
          Data\\msmdsrv.port.txt

    Returns a connection string like "localhost:50001" when found.
    """
    local_app_data = os.environ.get("LOCALAPPDATA")
    if not local_app_data:
        return None
    ws_base = (
        Path(local_app_data)
        / "Microsoft"
        / "Power BI Desktop"
        / "AnalysisServicesWorkspaces"
    )
    if not ws_base.exists():
        return None
    for ws_dir in ws_base.iterdir():
        port_file = ws_dir / "Data" / "msmdsrv.port.txt"
        if port_file.exists():
            port = port_file.read_text(encoding="utf-8").strip()
            if port.isdigit():
                return f"localhost:{port}"
    return None


# ---------------------------------------------------------------------------
# XMLA connection resolution
# ---------------------------------------------------------------------------

def resolve_xmla_connection(
    model_path: str,
    opts: XmlaConnectionOptions,
) -> Optional[ResolvedXmlaConnection]:
    """
    Resolve which XMLA endpoint to use for test execution.

    Priority:
      1. Remote Power BI Premium / Fabric workspace (when tenant_id,
         workspace_id, dataset_id are all provided), matching Invoke-DQVTesting.
      2. Local Power BI Desktop instance (auto-detected via port file).

    Returns None when no connection can be established.
    """
    # Option 1 — remote workspace (service principal)
    if opts.tenant_id and opts.workspace_id and opts.dataset_id:
        server = (
            f"powerbi://api.powerbi.com/v1.0/{opts.tenant_id}/{opts.workspace_id}"
        )
        return ResolvedXmlaConnection(
            server=server,
            catalog=opts.dataset_id,
            tenant_id=opts.tenant_id,
            client_id=opts.client_id,
            client_secret=opts.client_secret,
        )

    # Option 2 — local Power BI Desktop
    pbip_file = _find_pbip_file(model_path)
    if pbip_file:
        port = _detect_local_pbi_desktop_port()
        if port:
            model_name = Path(pbip_file).stem
            return ResolvedXmlaConnection(server=port, catalog=model_name)

    return None


# ---------------------------------------------------------------------------
# MSAL token acquisition (service principal / client-credentials flow)
# ---------------------------------------------------------------------------

def _acquire_service_principal_token(
    tenant_id: str,
    client_id: str,
    client_secret: str,
) -> str:
    """
    Acquire an OAuth2 access token for a service principal via MSAL.

    Uses the client-credentials flow, targeting the Power BI / Analysis
    Services scope (https://analysis.windows.net/powerbi/api/.default).
    This mirrors the authentication approach used by Invoke-DQVTesting
    for build-agent pipelines that require row-level security evaluation.
    """
    if not HAS_MSAL:
        raise ImportError(
            "msal is required for service principal authentication. "
            "Install with: pip install msal"
        )
    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
    )
    result = app.acquire_token_for_client(
        scopes=["https://analysis.windows.net/powerbi/api/.default"]
    )
    if "access_token" in result:
        return result["access_token"]
    raise RuntimeError(
        "Failed to acquire access token: "
        + result.get("error_description", result.get("error", "Unknown error"))
    )


# ---------------------------------------------------------------------------
# XMLA query execution via pyadomd (ADOMD.NET)
# ---------------------------------------------------------------------------

def _build_connection_string(conn: ResolvedXmlaConnection) -> str:
    """
    Build an ADOMD.NET connection string for the given resolved connection.

    Auth priority:
      1. Bearer token (access_token) — preferred, acquired via MSAL.
      2. Service principal direct credentials (app:{clientId}@{tenantId}).
      3. Local / integrated auth — no extra parameters.
    """
    base = f"Data Source={conn.server};Initial Catalog={conn.catalog};"
    if conn.access_token:
        return base + f"Password={conn.access_token};"
    if conn.client_id and conn.client_secret and conn.tenant_id:
        return (
            base
            + f"User ID=app:{conn.client_id}@{conn.tenant_id};"
            + f"Password={conn.client_secret};"
        )
    return base


def _get_col(row: dict[str, object], key: str) -> str:
    """
    Case-insensitive column lookup for ADOMD.NET result rows.

    DAX/ADOMD.NET may return column names with a table prefix
    (e.g. "Calculations[TestName]") so we match by substring to handle
    both plain column names ("TestName") and bracket notation.
    """
    key_lower = key.lower()
    for k, v in row.items():
        k_lower = k.lower()
        # Exact match or bracket-notation prefix: "testname" or "table[testname]"
        if k_lower == key_lower or k_lower.endswith(f"[{key_lower}]"):
            return str(v) if v is not None else ""
    return ""


def _execute_dax_query(
    conn: ResolvedXmlaConnection,
    dax_query: str,
) -> list[dict[str, object]]:
    """
    Execute a DAX query via ADOMD.NET (pyadomd) and return rows as dicts.

    For service-principal connections an OAuth2 bearer token is acquired
    via MSAL when raw credentials are supplied without a pre-existing token.
    Token-based auth is preferred because it supports row-level security
    evaluation with service principals — the primary use-case for build agents.
    """
    if not HAS_PYADOMD:
        raise ImportError(
            "pyadomd is required for XMLA query execution. "
            "Install with: pip install pyadomd"
        )

    # Acquire bearer token for service principal if credentials supplied
    if (
        conn.client_id
        and conn.client_secret
        and conn.tenant_id
        and not conn.access_token
    ):
        conn.access_token = _acquire_service_principal_token(
            conn.tenant_id, conn.client_id, conn.client_secret
        )

    conn_str = _build_connection_string(conn)
    with Pyadomd(conn_str) as db:
        with db.cursor().execute(dax_query) as cursor:
            if cursor.description is None:
                return []
            columns = [col.name for col in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]


# ---------------------------------------------------------------------------
# Public API — discovery
# ---------------------------------------------------------------------------

def retrieve_tests(model_path: str) -> list[PqlTest]:
    """
    Retrieve all DAX test suites from a PBIP model directory.

    Scans the SemanticModel's DAXQueries/ folder for *.Tests.dax files
    and returns a descriptor for each.

    Parameters
    ----------
    model_path:
        Root directory of the PBIP model (contains the .pbip file).

    Returns
    -------
    List of PqlTest descriptors; empty list when none are found.
    """
    semantic_model_dir = _find_semantic_model_dir(model_path)
    if not semantic_model_dir:
        return []
    return [_parse_dax_test_file(f) for f in _collect_dax_test_files(semantic_model_dir)]


def retrieve_test_by_name(model_path: str, test_name: str) -> Optional[PqlTest]:
    """
    Retrieve a single DAX test suite by name (case-insensitive).

    The name is matched against the file stem without .dax extension,
    e.g. "Calculations.DEV.Tests".
    """
    for t in retrieve_tests(model_path):
        if t.name.lower() == test_name.lower():
            return t
    return None


# ---------------------------------------------------------------------------
# Public API — execution
# ---------------------------------------------------------------------------

def run_test(
    test: PqlTest,
    connection: Optional[ResolvedXmlaConnection] = None,
) -> list[TestResult]:
    """
    Execute a single DAX test suite via ADOMD.NET / XMLA.

    Returns one TestResult per assertion row in the EVALUATE result set.
    When no connection is available a single failed/skipped result is
    returned so callers can still report the suite without throwing.
    """
    start = time.monotonic()

    if not connection:
        return [
            TestResult(
                test_name=test.name,
                passed=False,
                message=(
                    "No XMLA connection available. "
                    "Open the model in Power BI Desktop or supply "
                    "--tenant-id, --workspace-id, and --dataset-id."
                ),
                duration_ms=(time.monotonic() - start) * 1000.0,
            )
        ]

    try:
        rows = _execute_dax_query(connection, test.source)

        if not rows:
            return [
                TestResult(
                    test_name=test.name,
                    passed=False,
                    message=(
                        "Query returned no rows — "
                        "ensure the EVALUATE expression is correct."
                    ),
                    duration_ms=(time.monotonic() - start) * 1000.0,
                )
            ]

        results: list[TestResult] = []
        for row in rows:
            row_test_name = _get_col(row, "TestName") or test.name
            passed_val = _get_col(row, "Passed").lower()
            passed = passed_val in ("true", "1")
            expected = _get_col(row, "Expected")
            actual = _get_col(row, "Actual")
            rule_desc = _get_col(row, "RuleDescription")

            parts = [f"Expected: {expected}", f"Actual: {actual}"]
            if rule_desc:
                parts.append(f"Rule: {rule_desc}")

            results.append(
                TestResult(
                    test_name=row_test_name,
                    passed=passed,
                    message=" | ".join(parts),
                    duration_ms=(time.monotonic() - start) * 1000.0,
                )
            )
        return results

    except Exception as exc:  # noqa: BLE001
        return [
            TestResult(
                test_name=test.name,
                passed=False,
                message="Test execution failed",
                error=str(exc),
                duration_ms=(time.monotonic() - start) * 1000.0,
            )
        ]


def run_tests(
    tests: list[PqlTest],
    connection: Optional[ResolvedXmlaConnection] = None,
) -> list[TestResult]:
    """Execute all DAX test suites and return the flat list of assertion results."""
    results: list[TestResult] = []
    for t in tests:
        results.extend(run_test(t, connection))
    return results


def run_tests_from_model(
    model_path: str,
    test_name: Optional[str] = None,
    conn_opts: Optional[XmlaConnectionOptions] = None,
    connection: Optional[ResolvedXmlaConnection] = None,
) -> TestSuite:
    """
    High-level helper: discover tests, optionally filter, execute, and summarise.

    Parameters
    ----------
    model_path:
        Root directory of the PBIP model.
    test_name:
        Optional. When supplied only that test suite is executed.
    conn_opts:
        XMLA connection options. Defaults to local auto-detection only.

    Returns
    -------
    TestSuite with discovery info and execution results.
    """
    if conn_opts is None:
        conn_opts = XmlaConnectionOptions()

    if test_name:
        found = retrieve_test_by_name(model_path, test_name)
        tests: list[PqlTest] = [found] if found else []
    else:
        tests = retrieve_tests(model_path)

    # Use a pre-resolved connection when supplied (e.g. from --local detection),
    # otherwise resolve from conn_opts as normal.
    if connection is None:
        connection = resolve_xmla_connection(model_path, conn_opts)
    results = run_tests(tests, connection)
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)

    return TestSuite(
        model_path=model_path,
        tests=tests,
        results=results,
        passed=passed,
        failed=failed,
        total=len(results),
    )
