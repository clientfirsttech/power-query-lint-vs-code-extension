# CI/CD Examples

## GitHub Actions

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

      - name: Install pql-test
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

## Azure DevOps Pipelines

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
    displayName: 'Install pql-test'

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
