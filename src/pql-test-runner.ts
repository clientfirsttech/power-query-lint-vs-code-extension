/**
 * PQL Test Runner - Core library for discovering and executing DAX tests
 *
 * Tests live in the SemanticModel's DAXQueries/ folder as .dax files whose
 * names match the pattern *.Tests.dax (e.g. Calculations.DEV.Tests.dax).
 *
 * Execution uses Invoke-ASCmd (Analysis Services PowerShell module) in the
 * same style as Invoke-DQVTesting: the DAX query is sent via XMLA to either
 * the locally-open Power BI Desktop instance (detected from the .pbip path)
 * or a Power BI Premium / Fabric workspace endpoint.
 *
 * XMLA connection resolution priority:
 *   1. Local Power BI Desktop (localhost:NNNNN) – detected automatically when
 *      a .pbip file exists in modelPath and a PBIDesktop process is running.
 *   2. Remote workspace endpoint built from tenantId + workspaceId + datasetId
 *      when those parameters are provided.
 *
 * Results are parsed from the standard 4-column PQL.Assert schema:
 *   [TestName], [Expected], [Actual], [Passed]
 * Best-practice files (BestPractices.*.Tests.dax) return a 5-column schema;
 * these are executed separately and the extra RuleDescription column is surfaced.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawnSync } from 'child_process';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single DAX test file discovered in a PBIP model */
export interface PqlTest {
  /** Test suite name derived from the file name (e.g. "Calculations.DEV.Tests") */
  name: string;
  /** Optional description of the test suite */
  description?: string;
  /** Absolute path to the .dax source file */
  filePath: string;
  /** Raw DAX source */
  source: string;
}

/** Result of executing a single DAX test query (one row from EVALUATE output) */
export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  error?: string;
  duration?: number;
}

/** Summary of a full test run against a model */
export interface TestSuite {
  modelPath: string;
  tests: PqlTest[];
  results: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

/**
 * Connection options for XMLA execution.
 * When omitted, the runner attempts to connect to a local Power BI Desktop
 * instance automatically.
 */
export interface XmlaConnectionOptions {
  /** Azure AD tenant ID (required for remote workspace connections) */
  tenantId?: string;
  /** Power BI workspace ID (GUID) for remote connections */
  workspaceId?: string;
  /** Dataset / semantic model ID (GUID) for remote connections */
  datasetId?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers — model discovery
// ---------------------------------------------------------------------------

/**
 * Locate the .SemanticModel directory inside a PBIP model root.
 */
function findSemanticModelDir(modelPath: string): string | undefined {
  if (!fs.existsSync(modelPath)) {
    return undefined;
  }

  for (const entry of fs.readdirSync(modelPath)) {
    if (entry.endsWith('.SemanticModel')) {
      const candidate = path.join(modelPath, entry);
      if (fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    }
  }
  return undefined;
}

/**
 * Locate the .pbip file in the model root directory.
 * Returns its absolute path when found, otherwise undefined.
 */
function findPbipFile(modelPath: string): string | undefined {
  if (!fs.existsSync(modelPath)) {
    return undefined;
  }
  for (const entry of fs.readdirSync(modelPath)) {
    if (entry.endsWith('.pbip')) {
      return path.join(modelPath, entry);
    }
  }
  return undefined;
}

/**
 * Return all *.Tests.dax files from the DAXQueries/ folder of a SemanticModel.
 */
function collectDaxTestFiles(semanticModelDir: string): string[] {
  const daxQueriesDir = path.join(semanticModelDir, 'DAXQueries');
  if (!fs.existsSync(daxQueriesDir)) {
    return [];
  }

  return fs
    .readdirSync(daxQueriesDir)
    .filter((f) => f.endsWith('.Tests.dax'))
    .map((f) => path.join(daxQueriesDir, f));
}

/**
 * Parse a *.Tests.dax file into a PqlTest descriptor.
 */
function parseDaxTestFile(filePath: string): PqlTest {
  const source = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath, '.dax');

  // Surface the FUNCTION name as description when present
  const funcMatch = source.match(/FUNCTION\s+([\w.]+)\s*=/i);
  const description = funcMatch ? `DAX function: ${funcMatch[1]}` : undefined;

  return { name, description, filePath, source };
}

// ---------------------------------------------------------------------------
// Internal helpers — XMLA connection
// ---------------------------------------------------------------------------

/**
 * Build an XMLA connection string for a remote Power BI Premium / Fabric
 * workspace, matching the pattern used by Invoke-DQVTesting.
 *
 *   powerbi://api.powerbi.com/v1.0/<tenantId>/<workspaceId>
 *
 * The initial catalog is set to the datasetId.
 */
function buildRemoteXmlaConnectionString(opts: Required<XmlaConnectionOptions>): string {
  const server = `powerbi://api.powerbi.com/v1.0/${opts.tenantId}/${opts.workspaceId}`;
  return `Data Source=${server};Initial Catalog=${opts.datasetId};`;
}

/**
 * Attempt to discover the local Power BI Desktop XMLA port for the model
 * identified by the given .pbip file path.
 *
 * Power BI Desktop exposes a local Analysis Services instance on a dynamic
 * port. The port is written to a file at:
 *   %LOCALAPPDATA%\Microsoft\Power BI Desktop\AnalysisServicesWorkspaces\
 *       AnalysisServicesWorkspace<port>\Data\msmdsrv.port.txt
 *
 * Returns a connection string like "localhost:50001" when found, otherwise
 * undefined.
 */
function detectLocalPbiDesktopPort(): string | undefined {
  const localAppData = process.env['LOCALAPPDATA'];
  if (!localAppData) {
    return undefined;
  }

  const wsBase = path.join(
    localAppData,
    'Microsoft',
    'Power BI Desktop',
    'AnalysisServicesWorkspaces'
  );
  if (!fs.existsSync(wsBase)) {
    return undefined;
  }

  // Each workspace folder contains Data/msmdsrv.port.txt
  for (const wsDir of fs.readdirSync(wsBase)) {
    const portFile = path.join(wsBase, wsDir, 'Data', 'msmdsrv.port.txt');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      if (/^\d+$/.test(port)) {
        return `localhost:${port}`;
      }
    }
  }
  return undefined;
}

/**
 * Resolve the XMLA server address to use for test execution.
 *
 * Returns an object with `server` (XMLA endpoint) and `catalog` (database
 * name / dataset id), or undefined when no connection can be established.
 */
export function resolveXmlaConnection(
  modelPath: string,
  opts: XmlaConnectionOptions
): { server: string; catalog: string } | undefined {
  // Option 1 — remote workspace connection (explicit params take priority)
  if (opts.tenantId && opts.workspaceId && opts.datasetId) {
    const server = `powerbi://api.powerbi.com/v1.0/${opts.tenantId}/${opts.workspaceId}`;
    return { server, catalog: opts.datasetId };
  }

  // Option 2 — local Power BI Desktop
  const pbipFile = findPbipFile(modelPath);
  if (pbipFile) {
    const localPort = detectLocalPbiDesktopPort();
    if (localPort) {
      // Derive the model name from the .pbip file name (without extension)
      // to use as the Analysis Services catalog name.
      const modelName = path.basename(pbipFile, '.pbip');
      return { server: localPort, catalog: modelName };
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers — Invoke-ASCmd execution (matches Invoke-DQVTesting style)
// ---------------------------------------------------------------------------

/**
 * Invoke a DAX query via Invoke-ASCmd PowerShell cmdlet, mirroring the
 * approach used by Invoke-DQVTesting.
 *
 * Invoke-DQVTesting invokes DAX queries using the Analysis Services PowerShell
 * module (SqlServer or AnalysisServicesModule) and parses the XML result set
 * into typed rows.  We replicate that approach here, executing a PowerShell
 * one-liner that:
 *   1. Imports the SqlServer module (which ships with SSMS / SQL Server tools)
 *   2. Calls Invoke-ASCmd with the server, database (catalog) and query
 *   3. Outputs the raw XML so we can parse the rows in TypeScript
 *
 * @returns Raw XML string from Invoke-ASCmd, or throws on error
 */
function invokeASCmd(
  server: string,
  catalog: string,
  daxQuery: string
): string {
  // Escape single quotes in the query for embedding in a PowerShell string
  const escapedQuery = daxQuery.replace(/'/g, "''");

  const psScript = [
    `Import-Module SqlServer -ErrorAction SilentlyContinue`,
    `if (-not (Get-Command Invoke-ASCmd -ErrorAction SilentlyContinue)) {`,
    `  Import-Module AnalysisServicesModule -ErrorAction Stop`,
    `}`,
    `Invoke-ASCmd -Server '${server}' -Database '${catalog}' -Query '${escapedQuery}'`,
  ].join('; ');

  const result = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
    encoding: 'utf8',
    timeout: 120_000,
  });

  if (result.status !== 0) {
    const errMsg = result.stderr?.trim() || result.stdout?.trim() || 'Unknown error from Invoke-ASCmd';
    throw new Error(errMsg);
  }

  return result.stdout ?? '';
}

/**
 * Parse the XML output of Invoke-ASCmd into an array of row objects.
 *
 * Invoke-ASCmd returns an XML ADOMD.NET rowset. Each row is wrapped in a
 * `<row>` element whose children are the column values.  We do a lightweight
 * regex-based parse (no XML lib needed) to extract column/value pairs.
 *
 * Standard PQL.Assert schema (4 columns):
 *   [TestName], [Expected], [Actual], [Passed]
 *
 * Best-practice schema (5 columns):
 *   [TestName], [Expected], [Actual], [Passed], [RuleDescription]
 */
function parseAsCmdRows(xml: string): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];

  // Match each <row>...</row> block
  const rowPattern = /<row>([\s\S]*?)<\/row>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const rowXml = rowMatch[1];
    const row: Record<string, string> = {};

    // Match each <ColumnName>value</ColumnName> pair within the row
    const colPattern = /<([^/>]+)>([\s\S]*?)<\/\1>/g;
    let colMatch: RegExpExecArray | null;

    while ((colMatch = colPattern.exec(rowXml)) !== null) {
      // Remove XML namespace prefixes (e.g. "t:TestName" → "TestName")
      const colName = colMatch[1].replace(/^[^:]+:/, '');
      row[colName] = colMatch[2].trim();
    }

    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Public API — RetrieveTests & RetrieveTestByName
// ---------------------------------------------------------------------------

/**
 * Retrieve all DAX test suites from a PBIP model directory.
 *
 * Scans the SemanticModel's DAXQueries/ folder for files matching
 * *.Tests.dax and returns a descriptor for each.
 *
 * @param modelPath - Root directory of the PBIP model (contains .pbip file)
 * @returns Array of discovered test suite descriptors (empty if none found)
 */
export function retrieveTests(modelPath: string): PqlTest[] {
  const semanticModelDir = findSemanticModelDir(modelPath);
  if (!semanticModelDir) {
    return [];
  }

  return collectDaxTestFiles(semanticModelDir).map(parseDaxTestFile);
}

/**
 * Retrieve a single DAX test suite descriptor by name (case-insensitive).
 *
 * The name is matched against the file-stem (without .dax extension), e.g.
 * "Calculations.DEV.Tests".
 *
 * @param modelPath - Root directory of the PBIP model
 * @param testName  - Test suite name to find (case-insensitive)
 * @returns The matching descriptor, or undefined if not found
 */
export function retrieveTestByName(
  modelPath: string,
  testName: string
): PqlTest | undefined {
  return retrieveTests(modelPath).find(
    (t) => t.name.toLowerCase() === testName.toLowerCase()
  );
}

// ---------------------------------------------------------------------------
// Test execution
// ---------------------------------------------------------------------------

/**
 * Execute a single DAX test suite file via Invoke-ASCmd and return one
 * TestResult per assertion row in the result set.
 *
 * Mirrors the Invoke-DQVTesting execution pattern:
 *   - Connect via XMLA (local PBI Desktop or remote workspace)
 *   - Execute the EVALUATE query
 *   - Parse the rowset into pass/fail results
 *
 * When no XMLA connection is available the function returns a single skipped
 * result rather than throwing, so callers can still report the suite.
 */
export function runTest(
  test: PqlTest,
  connection?: { server: string; catalog: string }
): TestResult[] {
  const start = Date.now();

  if (!connection) {
    return [
      {
        testName: test.name,
        passed: false,
        message:
          'No XMLA connection available. ' +
          'Open the model in Power BI Desktop or supply --tenant-id, --workspace-id, and --dataset-id.',
        duration: Date.now() - start,
      },
    ];
  }

  try {
    const xml = invokeASCmd(connection.server, connection.catalog, test.source);
    const rows = parseAsCmdRows(xml);

    if (rows.length === 0) {
      return [
        {
          testName: test.name,
          passed: false,
          message: 'Query returned no rows — ensure the EVALUATE expression is correct.',
          duration: Date.now() - start,
        },
      ];
    }

    return rows.map((row) => {
      // Column names may be prefixed with the table name returned by DAX
      const getName = (key: string): string => {
        const found = Object.keys(row).find((k) =>
          k.toLowerCase().endsWith(key.toLowerCase())
        );
        return found ? row[found] : '';
      };

      const rowTestName = getName('TestName') || test.name;
      const passedVal = getName('Passed').toString().toLowerCase();
      const passed = passedVal === 'true' || passedVal === '1';
      const expected = getName('Expected');
      const actual = getName('Actual');
      const ruleDesc = getName('RuleDescription');

      const messageParts = [`Expected: ${expected}`, `Actual: ${actual}`];
      if (ruleDesc) {
        messageParts.push(`Rule: ${ruleDesc}`);
      }

      return {
        testName: rowTestName,
        passed,
        message: messageParts.join(' | '),
        duration: Date.now() - start,
      };
    });
  } catch (err) {
    return [
      {
        testName: test.name,
        passed: false,
        message: 'Test execution failed',
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      },
    ];
  }
}

/**
 * Execute all DAX test suites and return a flat list of assertion results.
 */
export function runTests(
  tests: PqlTest[],
  connection?: { server: string; catalog: string }
): TestResult[] {
  return tests.flatMap((t) => runTest(t, connection));
}

/**
 * High-level helper: discover tests, optionally filter to one suite, execute
 * them via XMLA, and return a TestSuite summary.
 *
 * @param modelPath  - Root directory of the PBIP model
 * @param testName   - Optional test suite name; omit to run all suites
 * @param connOpts   - XMLA connection options (tenantId/workspaceId/datasetId)
 * @returns A TestSuite with discovery info and execution results
 */
export function runTestsFromModel(
  modelPath: string,
  testName?: string,
  connOpts: XmlaConnectionOptions = {}
): TestSuite {
  let tests: PqlTest[];

  if (testName) {
    const found = retrieveTestByName(modelPath, testName);
    tests = found ? [found] : [];
  } else {
    tests = retrieveTests(modelPath);
  }

  const connection = resolveXmlaConnection(modelPath, connOpts);
  const results = runTests(tests, connection);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    modelPath,
    tests,
    results,
    passed,
    failed,
    total: results.length,
  };
}
