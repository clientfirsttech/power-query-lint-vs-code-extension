---
name: pql-test
description: pql-test CLI tool for running PQL.Assert DAX tests against Power BI semantic models. Use when executing tests locally or in CI/CD pipelines, discovering tests by environment, or integrating test results with automation workflows.
user-invokable: false
---

# pql-test — Semantic Model Test Execution CLI

CLI for discovering and running DAX tests in Power BI PBIP semantic models via XMLA.

| Package | Version | Python | License |
|---------|---------|--------|---------|
| `pql-test` | 0.1.13 | ≥3.9 | BUSL-1.1 |

## Installation

### Virtual Environment Setup (Recommended)

```bash
# Create and activate virtual environment
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (cmd)
.venv\Scripts\activate.bat

# macOS/Linux
source .venv/bin/activate

# Install pql-test
pip install pql-test

# Verify installation
pql-test --version
```

### Global Installation

```bash
pip install pql-test
```

### Development Installation

```bash
cd python
pip install -e .
```

### Dependencies

Automatically installed: `pyadomd`, `msal`, `azure-identity`, `keyring`, `click`, `python-dotenv`, `psutil`

---

## Quick Start

### Local Power BI Desktop (Auto-Detect)

```bash
# Test a .pbip project (auto-connects to Desktop if open)
pql-test run-tests ./Model.SemanticModel

# Test by model name (requires Desktop running)
pql-test run-tests local/SalesModel
```

### Remote Premium/Fabric XMLA

```bash
pql-test run-tests ./Model.SemanticModel \
  --tenant-id <TENANT_GUID> \
  --workspace-id <WORKSPACE_GUID> \
  --dataset-id <DATASET_GUID> \
  --client-id <APP_ID> \
  --client-secret <SECRET>
```

---

## CLI Reference

### `pql-test run-tests`

Run DAX tests against a PBIP semantic model.

```bash
pql-test run-tests <modelPath> [OPTIONS]
```

#### Options

| Flag | Env Variable | Description |
|------|--------------|-------------|
| `--env <ENV>` | — | Filter by environment: `DEV`, `STG`, `PRD`, `ANY` |
| `--output <file>` | — | Save JSON results to file |
| `--log-format <fmt>` | — | Output format: `default`, `azuredevops`, `github` |
| `--tenant-id <GUID>` | `PQL_TENANT_ID` | Azure AD tenant ID |
| `--workspace-id <GUID>` | `PQL_WORKSPACE_ID` | Power BI workspace GUID |
| `--dataset-id <GUID>` | `PQL_DATASET_ID` | Dataset/semantic model GUID |
| `--client-id <ID>` | `PQL_CLIENT_ID` | Service principal client ID |
| `--client-secret <SECRET>` | `PQL_CLIENT_SECRET` | Service principal secret |

#### Model Path Formats

| Format | Description |
|--------|-------------|
| `./path/to/Model.SemanticModel` | Local .pbip project folder |
| `local/<model_name>` | Model open in Power BI Desktop |

### `pql-test auth login`

Authenticate with Power BI service for interactive sessions.

```bash
pql-test auth login --environment <cloud>
```

**Cloud options:** `Public` (default), `Germany`, `China`, `USGov`, `USGovHigh`, `USGovDoD`

### `pql-test retrieve-tests`

Discover test functions from a model without executing them.

```bash
pql-test retrieve-tests ./Model.SemanticModel
```

---

## Environment-Scoped Test Execution

Tests following the naming convention `<Suite>.<ENV>.Tests` are filtered by environment:

```bash
# Run DEV tests (includes .DEV. and .ANY. tests)
pql-test run-tests ./Model.SemanticModel --env DEV

# Run staging tests
pql-test run-tests ./Model.SemanticModel --env STG

# Run production health checks
pql-test run-tests ./Model.SemanticModel --env PRD

# Run all tests (no filter)
pql-test run-tests ./Model.SemanticModel
```

### Test File Conventions

- **Location:** `*.SemanticModel/DAXQueries/`
- **Naming:** `<Suite>.<ENV>.Tests.dax` (e.g., `Calculations.DEV.Tests.dax`)
- **Environment segments:** `DEV`, `STG`, `PRD`, `ANY`

---

## JSON Output Schema

```json
{
  "model_path": "/examples/SampleModel.SemanticModel",
  "passed": 5,
  "failed": 1,
  "skipped": 0,
  "total": 6,
  "results": [
    {
      "test_name": "Revenue calculation",
      "passed": false,
      "message": "Expected: 5 | Actual: 7"
    }
  ]
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed (or no tests discovered) |
| `1` | Tests failed, error occurred, or all tests skipped |

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Semantic Model Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Create virtual environment
        run: |
          python -m venv .venv
          .venv\Scripts\Activate.ps1
          pip install pql-test
      
      - name: Run DEV Tests
        env:
          PQL_TENANT_ID: ${{ secrets.TENANT_ID }}
          PQL_WORKSPACE_ID: ${{ secrets.WORKSPACE_ID }}
          PQL_DATASET_ID: ${{ secrets.DATASET_ID }}
          PQL_CLIENT_ID: ${{ secrets.CLIENT_ID }}
          PQL_CLIENT_SECRET: ${{ secrets.CLIENT_SECRET }}
        run: |
          .venv\Scripts\Activate.ps1
          pql-test run-tests ./Model.SemanticModel `
            --env DEV `
            --output test-results.json `
            --log-format github
      
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results.json
```

### Azure DevOps Pipelines

```yaml
trigger:
  - main

pool:
  vmImage: 'windows-latest'

steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.11'

  - script: |
      python -m venv .venv
      call .venv\Scripts\activate.bat
      pip install pql-test
    displayName: 'Setup virtual environment'

  - script: |
      call .venv\Scripts\activate.bat
      pql-test run-tests $(Build.SourcesDirectory)/Model.SemanticModel ^
        --env STG ^
        --output $(Build.ArtifactStagingDirectory)/test-results.json ^
        --log-format azuredevops
    displayName: 'Run Semantic Model Tests'
    env:
      PQL_TENANT_ID: $(TenantId)
      PQL_WORKSPACE_ID: $(WorkspaceId)
      PQL_DATASET_ID: $(DatasetId)
      PQL_CLIENT_ID: $(ClientId)
      PQL_CLIENT_SECRET: $(ClientSecret)

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(Build.ArtifactStagingDirectory)'
      artifactName: 'TestResults'
```

---

## Authentication

### Connection Priority

| Priority | Method |
|----------|--------|
| 1 | **Local Power BI Desktop** — auto-detected via process inspection |
| 2 | **Remote Premium/Fabric** — provide all 5 connection flags |

### Service Principal Setup

```powershell
# Option 1: Environment variables
$env:PQL_TENANT_ID = "your-tenant-id"
$env:PQL_WORKSPACE_ID = "your-workspace-id"
$env:PQL_DATASET_ID = "your-dataset-id"
$env:PQL_CLIENT_ID = "your-client-id"
$env:PQL_CLIENT_SECRET = "your-client-secret"

pql-test run-tests ./Model.SemanticModel --env PRD

# Option 2: CLI flags
pql-test run-tests ./Model.SemanticModel `
  --tenant-id $TenantId `
  --workspace-id $WorkspaceId `
  --dataset-id $DatasetId `
  --client-id $ClientId `
  --client-secret $ClientSecret `
  --env PRD
```

### Interactive Login

```bash
# Login to Power BI service
pql-test auth login

# Login to specific cloud
pql-test auth login --environment USGov
```

---

## Best Practices

### Virtual Environment

1. **Always use virtual environments** — Isolates dependencies from system Python
2. **Pin versions in CI** — Use `pip install pql-test==0.1.13` for reproducibility
3. **Include in `.gitignore`** — Add `.venv/` to ignore the virtual environment folder

### Test Organization

1. **Separate runners by schema type** — Never UNION `PQL.Assert.BP` (5-column) with standard tests (4-column)
2. **Use environment prefixes** — `Schema.ANY.Tests`, `DataQuality.DEV.Tests`, `Metrics.PRD.Tests`
3. **Keep test functions focused** — One logical group per function

### CI/CD Guidelines

1. **Run DEV tests on every PR** — Catches calculation logic errors early
2. **Run PRD tests post-deployment** — Validates production data health
3. **Store results as artifacts** — Enable historical comparison
4. **Use `--log-format`** — Get native annotations in GitHub/Azure DevOps

---

## Troubleshooting

### "Model not found" Error

- **Local model**: Ensure Power BI Desktop has the model open
- **XMLA endpoint**: Verify all 5 connection parameters are provided
- **Authentication**: Run `pql-test auth login` for interactive sessions

### Tests Not Discovered

- Verify PQL.Assert functions are installed in the model
- Check function naming follows `<Suite>.<ENV>.Tests` pattern
- Confirm model compatibility level ≥ 1702

### Connection Failed

- **Local**: Power BI Desktop must be running with the model open
- **Remote**: Verify service principal has workspace access
- **Firewall**: Ensure XMLA endpoint is reachable

---

## Related Skills

- **pql-assert** — PQL.Assert DAX assertion library reference
- **dax-query-guidelines** — DAX query language best practices

## Links

- [PyPI Package](https://pypi.org/project/pql-test/)
- [GitHub Repository](https://github.com/clientfirsttech/PQL.Assert)
- [Documentation](https://github.com/clientfirsttech/PQL.Assert#readme)
