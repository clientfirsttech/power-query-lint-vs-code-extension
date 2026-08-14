---
name: pql-test
description: pql-test CLI tool for running PQL.Assert DAX tests against Power BI semantic models. Use when executing tests locally or in CI/CD pipelines, discovering tests by environment, or integrating test results with automation workflows.
user-invokable: false
---

# pql-test - Semantic Model Test Execution CLI

A Python CLI tool for discovering and executing PQL.Assert DAX tests against Power BI semantic models. Supports local Power BI Desktop instances and remote Fabric XMLA endpoints.

## Installation

```bash
pip install pql-test
```

**Requirements**:
- Python 3.9+
- PQL.Assert functions installed in the target semantic model (see `pql-assert` skill)

## Quick Start

### Run Tests Against Local Power BI Desktop

```bash
# Test a model open in Power BI Desktop by name
pql-test run-tests local/AdventureWorks

# Test a .pbip project (connects to Desktop if open)
pql-test run-tests path/to/Model.SemanticModel
```

### Run Tests Against Fabric XMLA Endpoint

```bash
# Test a model in Fabric workspace
pql-test run-tests "MyWorkspace.Workspace/SalesModel.SemanticModel" \
  --workspace-id YOUR_WORKSPACE_GUID
```

## CLI Reference

### `run-tests` Command

```bash
pql-test run-tests <MODEL_PATH> [OPTIONS]
```

#### Model Path Formats

| Format | Description | Example |
|--------|-------------|---------|
| `local/<model_name>` | Model open in Power BI Desktop | `local/SalesModel` |
| `<path/to/.SemanticModel>` | Local .pbip project folder | `./Sales.SemanticModel` |
| `<Workspace>/<Model>.SemanticModel` | Fabric service via XMLA | `Production.Workspace/Sales.SemanticModel` |

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--env <ENVIRONMENT>` | Filter tests by environment (DEV, TEST, PROD, ANY) | Run all tests |
| `--workspace-id <GUID>` | Fabric workspace ID (required for XMLA) | — |
| `--output <PATH>` | Write JSON results to file | stdout |
| `--log-format <FORMAT>` | Log format: `github` or `azuredevops` | plain |

## Environment-Scoped Test Execution

Tests following the PQL.Assert naming convention (`[name].[ENV].test(s)`) can be filtered by environment:

```bash
# Run only DEV environment tests (includes .DEV. and .ANY. tests)
pql-test run-tests local/MyModel --env DEV

# Run only PROD health checks
pql-test run-tests local/MyModel --env PROD

# Run all tests (no environment filter)
pql-test run-tests local/MyModel
```

### Test Discovery Flow

1. `pql-test` calls `PQL.Assert.RetrieveTestsByEnvironmentV2(<env>)` on the model
2. Returned tests matching `.{ENV}.` or `.ANY.` patterns are selected
3. Each test function is executed via `EVALUATE <FunctionName>()`
4. Results are collected and returned in structured JSON

## JSON Output Schema

```json
{
  "model_path": "local/AdventureWorks",
  "environment": "DEV",
  "executed_at": "2024-01-15T10:30:00Z",
  "summary": {
    "total": 12,
    "passed": 10,
    "failed": 2
  },
  "tests": [
    {
      "name": "DataQuality.DEV.Tests",
      "status": "passed",
      "results": [
        {
          "TestName": "Sales table has data",
          "Expected": true,
          "Actual": true,
          "Passed": true
        }
      ],
      "duration_ms": 245
    },
    {
      "name": "Schema.ANY.Tests",
      "status": "failed",
      "results": [
        {
          "TestName": "Customer ID column exists",
          "Expected": true,
          "Actual": false,
          "Passed": false
        }
      ],
      "duration_ms": 89
    }
  ]
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Semantic Model Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install pql-test
        run: pip install pql-test
      
      - name: Run DEV Tests
        run: |
          pql-test run-tests "${{ github.workspace }}/Model.SemanticModel" \
            --env DEV \
            --output test-results.json \
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
  vmImage: 'ubuntu-latest'

steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.11'

  - script: pip install pql-test
    displayName: 'Install pql-test'

  - script: |
      pql-test run-tests "$(Build.SourcesDirectory)/Model.SemanticModel" \
        --env TEST \
        --output $(Build.ArtifactStagingDirectory)/test-results.json \
        --log-format azuredevops
    displayName: 'Run Semantic Model Tests'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: '$(Build.ArtifactStagingDirectory)'
      artifactName: 'TestResults'
```

## Fabric XMLA Authentication

When running against Fabric XMLA endpoints, `pql-test` uses the Azure Identity credential chain:

1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`)
2. Managed Identity (when running in Azure)
3. Azure CLI credentials (`az login`)
4. Interactive browser authentication (local development)

### Service Principal Setup

```bash
# Set environment variables for service principal auth
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
export AZURE_TENANT_ID="your-tenant-id"

# Run tests against Fabric
pql-test run-tests "Sales.Workspace/Model.SemanticModel" \
  --workspace-id YOUR_WORKSPACE_GUID \
  --env PROD
```

## Best Practices

### Test Organization

1. **Separate runners by schema type** — Never UNION `PQL.Assert.BP` (5-column) with standard tests (4-column)
2. **Use environment prefixes** — `Schema.ANY.Tests`, `DataQuality.DEV.Tests`, `Metrics.PROD.Tests`
3. **Keep test functions focused** — One logical group per function

### CI/CD Guidelines

1. **Run DEV tests on every PR** — Catches calculation logic errors early
2. **Run PROD tests post-deployment** — Validates production data health
3. **Store results as artifacts** — Enable historical comparison
4. **Use `--log-format`** — Get native annotations in GitHub/Azure DevOps

### Local Development

1. **Keep Power BI Desktop open** — `local/<model>` requires active instance
2. **Reload .pbip after function changes** — TMDL functions require manual reload
3. **Use `--output` for debugging** — JSON output shows full result details

## Troubleshooting

### "Model not found" Error

- **Local model**: Ensure Power BI Desktop has the model open
- **XMLA endpoint**: Verify `--workspace-id` and model name spelling
- **Authentication**: Run `az login` or set service principal credentials

### Tests Not Discovered

- Verify PQL.Assert functions are installed (`PQL.Assert.RetrieveTestsV2()` should return results)
- Check function naming follows `[name].[ENV].test(s)` pattern
- Confirm model compatibility level ≥ 1702

### RLS Tests Failing

- Tests with `[PQLAssert_ImpersonatedUserName]` require impersonation
- Verify the impersonated user has model access
- Check RLS role membership for test user

## Related Skills

- **pql-assert** — PQL.Assert DAX assertion library reference
- **dax-query-guidelines** — DAX query language best practices
