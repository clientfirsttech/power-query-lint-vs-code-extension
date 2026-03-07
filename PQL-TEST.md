# pql-test — DAX Test Runner for PBIP Models

`pql-test` is a command-line tool bundled with the Power Query Lint VS Code
extension. It discovers and executes DAX unit-test suites stored inside a
**Power BI Project (PBIP)** semantic model, mirroring the
[`Invoke-DQVTesting`](https://github.com/kerski/fabric-dataops-patterns)
execution pattern.

Tests are plain `.dax` files that use the `PQL.Assert` family of functions.
The runner connects to Analysis Services via XMLA — either a locally-open
Power BI Desktop instance (auto-detected) or a remote Power BI Premium /
Microsoft Fabric workspace endpoint.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [PBIP Model Layout](#pbip-model-layout)
4. [Writing Test Files](#writing-test-files)
5. [Commands](#commands)
   - [check-prereqs](#check-prereqs)
   - [retrieve-tests](#retrieve-tests)
   - [retrieve-test](#retrieve-test)
   - [run-tests](#run-tests)
6. [Connection Options](#connection-options)
   - [Local Power BI Desktop (auto-detected)](#local-power-bi-desktop-auto-detected)
   - [Remote Power BI Premium / Fabric Workspace](#remote-power-bi-premium--fabric-workspace)
7. [Example Test Suites](#example-test-suites)
   - [Calculations](#calculations)
   - [Data Quality](#data-quality)
   - [Schema](#schema)
   - [Best Practices](#best-practices)
8. [Exit Codes](#exit-codes)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Node.js | 18.x | Required to run `pql-test` |
| npm | bundled with Node.js | Used for installation |
| PowerShell (`pwsh`) | 7.x | Required for XMLA execution via `Invoke-ASCmd` |
| SqlServer PowerShell module | any | Provides `Invoke-ASCmd`; install with `Install-Module SqlServer -Scope CurrentUser` |

Run the built-in check to verify your environment:

```bash
pql-test check-prereqs
```

---

## Installation

`pql-test` is included as a binary when you install the extension package:

```bash
# From the extension root
npm install
npm run compile

# Verify the CLI is available
npx pql-test --version
```

After `npm install`, `pql-test` is available as an `npx` command from within
the project, or globally if you link the package:

```bash
npm link          # makes pql-test available on PATH globally
pql-test --help
```

---

## PBIP Model Layout

`pql-test` expects a standard [PBIP](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview)
directory structure. Test files are placed in the `DAXQueries/` folder of the
`*.SemanticModel` directory:

```
MyModel/                               ← modelPath (passed to CLI)
├── MyModel.pbip                       ← triggers local PBI Desktop auto-detection
├── MyModel.SemanticModel/
│   ├── definition/
│   │   └── ...
│   └── DAXQueries/
│       ├── Calculations.DEV.Tests.dax ← picked up by retrieve-tests / run-tests
│       ├── DataQuality.DEV.Tests.dax
│       ├── Schema.DEV.Tests.dax
│       └── BestPractices.ANY.Tests.dax
└── MyModel.Report/
    └── ...
```

Any file whose name ends with `.Tests.dax` inside `DAXQueries/` is treated as
a test suite.

---

## Writing Test Files

Each test file defines a **DAX function** that returns a table of assertion
results, then immediately calls it with `EVALUATE`.

### Standard test schema (4 columns)

```dax
DEFINE
    FUNCTION Calculations.DEV.Tests = () =>
    UNION (
        PQL.Assert.ShouldEqual(
            "Calculations: Number of Characters equals COUNTROWS",
            [Number of Characters],
            COUNTROWS('MarvelFact')
        ),
        PQL.Assert.ShouldBeGreaterThan(
            "Calculations: Number of Characters is greater than zero",
            0,
            [Number of Characters]
        )
    )

EVALUATE Calculations.DEV.Tests()
```

The `EVALUATE` expression must return a table with exactly four columns:

| Column | Type | Description |
|---|---|---|
| `[TestName]` | Text | Name identifying the individual assertion |
| `[Expected]` | Any | The expected value |
| `[Actual]` | Any | The value returned by the model |
| `[Passed]` | Boolean / 0-1 | `TRUE` / `1` when the assertion passes |

### Best-practices test schema (5 columns)

Best-practices tests use the `PQL.Assert.BP.*` functions, which return an
extra `[RuleDescription]` column. **These must be kept in a separate file**
and must never be `UNION`-ed with standard 4-column tests.

```dax
// NOTE: PQL.Assert.BP functions return a 5-column schema
// (TestName, Expected, Actual, Passed, RuleDescription).
// This MUST be kept in a separate runner — never UNION with standard 4-column test results.

DEFINE
    FUNCTION BestPractices.ANY.Tests = () =>
    UNION (
        PQL.Assert.BP.CheckErrorPrevention(),
        PQL.Assert.BP.CheckFormatting(),
        PQL.Assert.BP.CheckDAXExpressions(),
        PQL.Assert.BP.CheckMaintenance(),
        PQL.Assert.BP.CheckPerformance()
    )

EVALUATE BestPractices.ANY.Tests()
```

### Naming convention

| File name pattern | Purpose |
|---|---|
| `Calculations.DEV.Tests.dax` | Measure / calculation correctness tests |
| `DataQuality.DEV.Tests.dax` | Row counts, null checks, uniqueness, referential integrity |
| `Schema.DEV.Tests.dax` | Table / column / relationship existence |
| `BestPractices.ANY.Tests.dax` | PQL best-practice rule checks (5-column schema) |

The `DEV` / `ANY` segment is a convention indicating the environment scope;
`pql-test` treats all `*.Tests.dax` files equally.

---

## Commands

### check-prereqs

Verify that all prerequisites are installed and accessible on `PATH`.

```bash
pql-test check-prereqs
```

**Example output:**

```
Prerequisites check:
  ✅ Node.js >= 18 — Current version: 20.11.0
  ✅ npm installed — npm 10.2.4
  ✅ PowerShell (pwsh) installed — PowerShell 7.4.1
  ✅ SqlServer PowerShell module (Invoke-ASCmd) — SqlServer module available

All prerequisites met.
```

---

### retrieve-tests

List all DAX test suites discovered in a PBIP model.

```bash
pql-test retrieve-tests <modelPath> [--verbose]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `<modelPath>` | ✅ | Path to the PBIP model root directory |
| `--verbose`, `-v` | ❌ | Also print file paths and connection info |

**Example:**

```bash
pql-test retrieve-tests ./examples/SampleModel
```

```
Found 4 DAX test suite(s):

  • BestPractices.ANY.Tests
  • Calculations.DEV.Tests
  • DataQuality.DEV.Tests
  • Schema.DEV.Tests
```

**With `--verbose`:**

```bash
pql-test retrieve-tests ./examples/SampleModel --verbose
```

```
Found 4 DAX test suite(s):

  • BestPractices.ANY.Tests
    File: /examples/SampleModel/SampleModel.SemanticModel/DAXQueries/BestPractices.ANY.Tests.dax
  • Calculations.DEV.Tests
    DAX function: Calcs.DEV.Tests
    File: /examples/SampleModel/SampleModel.SemanticModel/DAXQueries/Calculations.DEV.Tests.dax
  ...

Connection: none detected — open the model in Power BI Desktop or supply
  --tenant-id, --workspace-id, --dataset-id to run tests.
```

**Filter to a single suite using `--test`:**

```bash
pql-test retrieve-tests ./examples/SampleModel --test "Calculations.DEV.Tests"
```

---

### retrieve-test

Show a specific test suite by name (case-insensitive).

```bash
pql-test retrieve-test <modelPath> <name> [--verbose]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `<modelPath>` | ✅ | Path to the PBIP model root directory |
| `<name>` | ✅ | Test suite name (file stem without `.dax`) |
| `--verbose`, `-v` | ❌ | Also print the full DAX source |

**Example:**

```bash
pql-test retrieve-test ./examples/SampleModel "DataQuality.DEV.Tests"
```

```
Found 1 DAX test suite(s):

  • DataQuality.DEV.Tests
```

**With `--verbose`** (shows the full DAX source):

```bash
pql-test retrieve-test ./examples/SampleModel "DataQuality.DEV.Tests" --verbose
```

---

### run-tests

Execute DAX test suites in a PBIP model via XMLA and report pass/fail results.

```bash
pql-test run-tests <modelPath> [--test <name>] [--verbose]
                               [--tenant-id <id>]
                               [--workspace-id <id>]
                               [--dataset-id <id>]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `<modelPath>` | ✅ | Path to the PBIP model root directory |
| `--test <name>` | ❌ | Run only the named test suite |
| `--verbose`, `-v` | ❌ | Show messages and durations for all results (not just failures) |
| `--tenant-id <id>` | ❌ | Azure AD tenant ID (required for remote XMLA) |
| `--workspace-id <id>` | ❌ | Power BI workspace GUID (required for remote XMLA) |
| `--dataset-id <id>` | ❌ | Dataset / semantic model GUID (required for remote XMLA) |

**Run all suites against a locally-open Power BI Desktop model:**

```bash
pql-test run-tests ./examples/SampleModel
```

**Run all suites against a remote Power BI Premium / Fabric workspace:**

```bash
pql-test run-tests ./examples/SampleModel \
  --tenant-id  00000000-0000-0000-0000-000000000000 \
  --workspace-id 11111111-1111-1111-1111-111111111111 \
  --dataset-id   22222222-2222-2222-2222-222222222222
```

**Run a single named test suite:**

```bash
pql-test run-tests ./examples/SampleModel --test "Calculations.DEV.Tests"
```

**Example output (all passing):**

```
XMLA connection: localhost:50001 / catalog: SampleModel

Test run for: /examples/SampleModel
Results: 6 passed, 0 failed, 6 total

  ✅ Calculations: Number of Characters equals COUNTROWS
  ✅ Calculations: Number of Characters is greater than 1000
  ✅ Calculations: Running Total of Character Appearances is non-negative
  ✅ Calculations: Running Total of Character Appearances does not exceed total row count
  ✅ Calculations: Number of Characters Title By Date starts with correct prefix
  ✅ Calculations: Number of Characters returns 0 not blank for a date with no data
```

**Example output (with failures):**

```
XMLA connection: powerbi://api.powerbi.com/v1.0/myTenant/myWorkspace / catalog: 22222...

Test run for: /examples/SampleModel
Results: 4 passed, 2 failed, 6 total

  ✅ Calculations: Number of Characters equals COUNTROWS
  ✅ Calculations: Number of Characters is greater than 1000
  ❌ Calculations: Running Total of Character Appearances is non-negative
    Expected: 0 | Actual: -5
  ✅ Calculations: Running Total of Character Appearances does not exceed total row count
  ❌ Calculations: Number of Characters Title By Date starts with correct prefix
    Expected: Number of Characters that first appeared  | Actual: Characters first appeared
  ✅ Calculations: Number of Characters returns 0 not blank for a date with no data
```

**No XMLA connection detected:**

```
Warning: No XMLA connection detected. Tests will be reported as skipped.
Options:
  • Open the model in Power BI Desktop (auto-detected)
  • Supply --tenant-id <id> --workspace-id <id> --dataset-id <id>

Test run for: /examples/SampleModel
Results: 0 passed, 4 failed, 4 total

  ❌ BestPractices.ANY.Tests
    No XMLA connection available. Open the model in Power BI Desktop or supply
    --tenant-id, --workspace-id, and --dataset-id.
  ...
```

---

## Connection Options

`pql-test` resolves an XMLA connection using the following priority order:

### Local Power BI Desktop (auto-detected)

When a `.pbip` file exists in `<modelPath>` **and** a Power BI Desktop instance
is open with that model, `pql-test` automatically discovers the local Analysis
Services port from:

```
%LOCALAPPDATA%\Microsoft\Power BI Desktop\AnalysisServicesWorkspaces\
    AnalysisServicesWorkspace<port>\Data\msmdsrv.port.txt
```

No connection flags are required in this case — simply open the model in
Power BI Desktop before running:

```bash
# Open ./examples/SampleModel in Power BI Desktop first, then:
pql-test run-tests ./examples/SampleModel
```

> **Note:** Auto-detection only works on Windows where `%LOCALAPPDATA%` is
> set. On Linux/macOS CI agents, use the explicit remote connection flags.

### Remote Power BI Premium / Fabric Workspace

Provide all three connection flags to connect to a published dataset:

```bash
pql-test run-tests ./examples/SampleModel \
  --tenant-id  <azure-ad-tenant-id> \
  --workspace-id <power-bi-workspace-guid> \
  --dataset-id   <dataset-guid>
```

The CLI builds the XMLA endpoint as:

```
powerbi://api.powerbi.com/v1.0/<tenantId>/<workspaceId>
```

with `<datasetId>` as the Initial Catalog.

> **Workspace must be on Premium capacity or Fabric F-SKU** for XMLA
> read/write access. The user running `pql-test` must have at least
> **Contributor** access to the workspace.

---

## Example Test Suites

All examples below are based on the `SampleModel` in `examples/SampleModel/`.

### Calculations

`Calculations.DEV.Tests.dax` — verify that DAX measures return the expected values.

```dax
DEFINE
    FUNCTION Calcs.DEV.Tests = () =>
    UNION (
        // [Number of Characters] = COUNTROWS('MarvelFact')
        PQL.Assert.ShouldEqual(
            "Calculations: Number of Characters equals COUNTROWS",
            [Number of Characters],
            COUNTROWS('MarvelFact')
        ),

        // [Number of Characters] must always be > 1000
        PQL.Assert.ShouldBeGreaterThan(
            "Calculations: Number of Characters is greater than 1000",
            1000,
            [Number of Characters]
        ),

        // [Running Total of Character Appearances] must be non-negative
        PQL.Assert.ShouldBeGreaterOrEqual(
            "Calculations: Running Total of Character Appearances is non-negative",
            0,
            [Running Total of Character Appearances]
        ),

        // [Running Total of Character Appearances] must not exceed total row count
        PQL.Assert.ShouldBeLessOrEqual(
            "Calculations: Running Total of Character Appearances does not exceed total row count",
            COUNTROWS('MarvelFact'),
            [Running Total of Character Appearances]
        ),

        // [Number of Characters Title By Date] must start with the expected prefix
        PQL.Assert.ShouldStartWith(
            "Calculations: Number of Characters Title By Date starts with correct prefix",
            "Number of Characters that first appeared ",
            [Number of Characters Title By Date]
        ),

        // [Number of Characters] must return 0 (not blank) when no data exists
        PQL.Assert.ShouldEqual(
            "Calculations: Number of Characters returns 0 not blank for a date with no data",
            0,
            CALCULATE([Number of Characters], FILTER(ALL('DateDim'), 'DateDim'[Year] = -1))
        )
    )

EVALUATE Calcs.DEV.Tests()
```

---

### Data Quality

`DataQuality.DEV.Tests.dax` — verify row counts, null/blank values, uniqueness, and referential integrity.

```dax
DEFINE
    FUNCTION DataQuality.DEV.Tests = () =>
    UNION (
        // Row counts - all tables must have data
        PQL.Assert.Tbl.ShouldHaveRows("Data Quality: MarvelFact has rows", 'MarvelFact'),
        PQL.Assert.Tbl.ShouldHaveRows("Data Quality: DateDim has rows", 'DateDim'),
        PQL.Assert.Tbl.ShouldHaveRows("Data Quality: AlignmentDim has rows", 'AlignmentDim'),
        PQL.Assert.Tbl.ShouldHaveRows("Data Quality: EyeColorDim has rows", 'EyeColorDim'),

        // Null checks - key columns must not be null
        PQL.Assert.Col.ShouldNotBeNull("Data Quality: MarvelFact[Name] is not null", 'MarvelFact'[Name]),
        PQL.Assert.Col.ShouldNotBeNull("Data Quality: MarvelFact[Appearances] is not null", 'MarvelFact'[Appearances]),
        PQL.Assert.Col.ShouldNotBeNull("Data Quality: MarvelFact[DateID] is not null", 'MarvelFact'[DateID]),

        // Range checks
        PQL.Assert.Col.ShouldBeNonNegative("Data Quality: Appearances is non-negative", 'MarvelFact'[Appearances]),

        // Text cleanliness
        PQL.Assert.Col.TextShouldBeTrimmed("Data Quality: MarvelFact[Name] has no leading/trailing spaces", 'MarvelFact'[Name]),

        // Uniqueness checks on dimension keys
        PQL.Assert.Col.ShouldBeDistinct("Data Quality: AlignmentDim[AlignmentID] is unique", 'AlignmentDim'[AlignmentID]),
        PQL.Assert.Col.ShouldBeDistinct("Data Quality: DateDim[DateID] is unique", 'DateDim'[DateID]),

        // No null/blank dimension labels
        PQL.Assert.Col.ShouldNotBeNullOrBlank("Data Quality: AlignmentDim[Alignment] has no blank values", 'AlignmentDim'[Alignment]),

        // Referential integrity checks
        PQL.Assert.ShouldEqual(
            "Data Quality: All MarvelFact.DateID values exist in DateDim",
            0,
            COUNTROWS(FILTER('MarvelFact', ISBLANK(RELATED('DateDim'[DateID]))))
        ),
        PQL.Assert.ShouldEqual(
            "Data Quality: All MarvelFact.AlignmentID values exist in AlignmentDim",
            0,
            COUNTROWS(FILTER('MarvelFact', ISBLANK(RELATED('AlignmentDim'[AlignmentID]))))
        )
    )

EVALUATE DataQuality.DEV.Tests()
```

---

### Schema

`Schema.DEV.Tests.dax` — verify that required tables, columns, and relationships exist.

```dax
DEFINE
    FUNCTION Schema.DEV.Tests = () =>
    UNION (
        // Table existence
        PQL.Assert.Tbl.ShouldExist("Schema: MarvelFact table exists", "MarvelFact"),
        PQL.Assert.Tbl.ShouldExist("Schema: DateDim table exists", "DateDim"),
        PQL.Assert.Tbl.ShouldExist("Schema: AlignmentDim table exists", "AlignmentDim"),
        PQL.Assert.Tbl.ShouldExist("Schema: EyeColorDim table exists", "EyeColorDim"),

        // Column existence - MarvelFact
        PQL.Assert.Col.ShouldExist("Schema: MarvelFact[ID] exists", "MarvelFact", "ID"),
        PQL.Assert.Col.ShouldExist("Schema: MarvelFact[Name] exists", "MarvelFact", "Name"),
        PQL.Assert.Col.ShouldExist("Schema: MarvelFact[Appearances] exists", "MarvelFact", "Appearances"),

        // Column existence - DateDim
        PQL.Assert.Col.ShouldExist("Schema: DateDim[DateID] exists", "DateDim", "DateID"),
        PQL.Assert.Col.ShouldExist("Schema: DateDim[Date] exists", "DateDim", "Date"),
        PQL.Assert.Col.ShouldExist("Schema: DateDim[Year] exists", "DateDim", "Year"),

        // Relationships
        PQL.Assert.Relationship.ShouldExist(
            "Schema: MarvelFact-DateDim relationship exists",
            "MarvelFact", "DateID", "DateDim", "DateID"
        ),
        PQL.Assert.Relationship.ShouldExist(
            "Schema: MarvelFact-AlignmentDim relationship exists",
            "MarvelFact", "AlignmentID", "AlignmentDim", "AlignmentID"
        )
    )

EVALUATE Schema.DEV.Tests()
```

---

### Best Practices

`BestPractices.ANY.Tests.dax` — run PQL's built-in best-practice rules against
the model. Returns a **5-column** result set; must be kept in its own file.

```dax
// NOTE: PQL.Assert.BP functions return a 5-column schema
// (TestName, Expected, Actual, Passed, RuleDescription).
// This MUST be kept in a separate runner — never UNION with standard 4-column test results.

DEFINE
    FUNCTION BestPractices.ANY.Tests = () =>
    UNION (
        PQL.Assert.BP.CheckErrorPrevention(),
        PQL.Assert.BP.CheckFormatting(),
        PQL.Assert.BP.CheckDAXExpressions(),
        PQL.Assert.BP.CheckMaintenance(),
        PQL.Assert.BP.CheckPerformance()
    )

EVALUATE BestPractices.ANY.Tests()
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | All tests passed (or no tests were found) |
| `1` | One or more tests failed, a prerequisite is missing, or an error occurred |

CI pipelines can rely on these codes directly:

```bash
pql-test run-tests ./MyModel \
  --tenant-id "$TENANT_ID" \
  --workspace-id "$WORKSPACE_ID" \
  --dataset-id "$DATASET_ID"

if [ $? -ne 0 ]; then
  echo "DAX tests failed — blocking pipeline."
  exit 1
fi
```

---

## Troubleshooting

### `Error: Model path not found`

The `<modelPath>` argument must point to the PBIP model **root directory** (the
folder that contains the `.pbip` file and the `*.SemanticModel/` directory),
not to the `.SemanticModel` directory itself.

```bash
# Correct
pql-test run-tests ./examples/SampleModel

# Incorrect — do not point at the SemanticModel subfolder
pql-test run-tests ./examples/SampleModel/SampleModel.SemanticModel
```

### `No tests found`

Verify that:

1. The `*.SemanticModel/DAXQueries/` folder exists inside `<modelPath>`.
2. Test files end with `.Tests.dax` (e.g. `Calculations.DEV.Tests.dax`).
3. Files named without `.Tests` (e.g. `Query 1.dax`) are ignored by design.

### `No XMLA connection detected`

When running locally, make sure:

1. The model folder contains a `.pbip` file.
2. Power BI Desktop is **open** with the model loaded (not just saved).
3. The environment variable `%LOCALAPPDATA%` is set (Windows only).

For CI/CD pipelines, always supply all three remote connection flags:
`--tenant-id`, `--workspace-id`, `--dataset-id`.

### `pwsh not found on PATH`

Install PowerShell 7+ from:
<https://github.com/PowerShell/PowerShell/releases>

Then run `pql-test check-prereqs` again to confirm detection.

### `SqlServer module not found`

Open a PowerShell 7 prompt and run:

```powershell
Install-Module SqlServer -Scope CurrentUser -AllowClobber
```

### Query returned no rows

Ensure the final line of the `.dax` file is an `EVALUATE` statement that calls
the test function, for example:

```dax
EVALUATE Calculations.DEV.Tests()
```

### `Cannot connect to XMLA endpoint`

- Confirm the workspace is on **Premium capacity or Fabric F-SKU**.
- Confirm the signed-in account has at least **Contributor** access to the workspace.
- Check that the `--workspace-id` is the workspace GUID (not its display name).
- Check that `--dataset-id` is the semantic model GUID (visible in the dataset URL in the Power BI service).
