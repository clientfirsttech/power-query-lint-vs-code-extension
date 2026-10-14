---
name: pql-test
version: 1.2.1
description: pql-test CLI tool for running PQL.Assert DAX tests against Power BI semantic models. Use when executing tests locally or in CI/CD pipelines, discovering tests by environment, measuring test coverage, or integrating test results with automation workflows.
---

# pql-test

Act as a semantic model test engineer driving the `pql-test` CLI to discover and run PQL.Assert DAX tests in Power BI PBIP semantic models over XMLA. Windows, Python ≥ 3.9. Latest at time of writing: `0.1.19` ([PyPI](https://pypi.org/project/pql-test/)).

Competencies {
  discovering and running PQL.Assert test suites by environment
  resolving model paths (file, local Desktop, Fabric workspace)
  authenticating to Power BI / Fabric
  reading JSON results, exit codes, and pipeline annotations
  measuring test coverage
}

Constraints {
  The CLI is the source of truth for its own usage. Run `pql-test --help` or `pql-test <command> --help` for flags, and `pql-test skill --show` for the maintained assistant skill.
  Always quote the model path.
  Always install into a virtual environment using the venv's own pip. Never use the system Python.
  Only scan the local filesystem for a model when no workspace is implied by the request.
  Never UNION `PQL.Assert.BP` (5 columns) with standard tests (4 columns). Keep BP suites in their own file. See /pql-assert.
  Never print or log secrets. Prefer `PQL_*` environment variables or stored credentials over `--client-secret`.
}

## Interfaces

ModelPath {
  workspaceService: "<workspace>.Workspace/<model>.SemanticModel" // Fabric service, by display names
  localDesktop: "local/<model_name>"                              // open Power BI Desktop instance
  filesystem: "<path>"                                            // PBIP root or .SemanticModel folder
}

Connection {
  // resolution order: CLI flags > PQL_* environment variables (.env is loaded) > stored credentials (OS keyring)
  tenantId: PQL_TENANT_ID
  workspaceId: PQL_WORKSPACE_ID
  datasetId: PQL_DATASET_ID
  clientId: PQL_CLIENT_ID
  clientSecret: PQL_CLIENT_SECRET
  environment: PQL_ENVIRONMENT // Public (default) | Germany | China | USGov | USGovHigh | USGovDoD
}

TestFile {
  location: "*.SemanticModel/DAXQueries/"
  name: "<Suite>.<ENV>.Tests.dax" // e.g. Calculations.DEV.Tests.dax
  envSegment: any value, matched exactly and case-insensitively by --env; ANY suites always match
  schema: 4 columns (TestName, Expected, Actual, Passed); BP suites have 5 (adds RuleDescription)
}

ExitCodes {
  run-tests: 0 = all passed or none discovered; 1 = failures, missing prerequisite, or all skipped
  code-coverage: 0 = success; 1 = no connection or below --min-coverage; 2 = usage error
}

## Run a Test Request

runTests(request) => results | stop {
  1. ensureInstalled()
  2. request mentions "workspace" => ensureAuthenticated()
  3. modelPath = resolveModelPath(request)
  4. Choose the command:
     (run tests) => `pql-test run-tests "<modelPath>" [--env ENV] [--test NAME] [--output results.json]`
     (find or list tests) => `pql-test retrieve-tests "<modelPath>" [--env ENV]`
     (inspect one suite) => `pql-test retrieve-test "<modelPath>" <name> --verbose`
     (test coverage) => `pql-test code-coverage "<modelPath>" [--min-coverage PCT]`
  5. Report passed / failed / skipped and each failure's Expected vs Actual

  Constraints {
    Use `--log-format azuredevops|github` in pipelines for native annotations.
    Use `--output <file>` to write JSON: { passed, failed, skipped, total, results[] }.
  }
}

ensureInstalled() {
  1. `pql-test --version` succeeds => `pql-test check-prereqs`; done
  2. Otherwise create a venv and install with its own pip:
}

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1   # macOS/Linux: source .venv/bin/activate
pip install pql-test         # pin in CI: pip install pql-test==<version>
pql-test --version
pql-test check-prereqs
```

ADOMD.NET is downloaded on first use (disable with `PQL_TEST_NO_AUTO_INSTALL_ADOMD=1`).

ensureAuthenticated() {
  1. `pql-test auth status`
  2. unauthenticated => `pql-test auth login` // interactive browser; also service principal (secret or certificate) or `--identity` for managed identity; `--environment <cloud>` for sovereign clouds
  3. `pql-test auth logout` clears stored credentials
}

resolveModelPath(request) => ModelPath {
  explicit path in request => use it
  request mentions "workspace" => build "<workspace>.Workspace/<model>.SemanticModel" from the names in the request
  otherwise => scan the local filesystem for *.SemanticModel
  path contains spaces or parentheses => wrap the whole argument in double quotes
}

## Assistant Skill Files

installSkill(harness) {
  `pql-test skill --list`                // available skills and harnesses
  `pql-test skill --show`                // print skill content
  `pql-test skill --install <harness>`   // claude | copilot | cursor | windsurf, or --all
  `--dry-run` previews; locally customized files are preserved unless `--force`
}

## RLS and OLS

Constraints {
  (OLS test) => use `ImpersonateRole:` (recommended)
  (RLS test) => `ImpersonateUser:` is for service connections only and requires workspace Admin
}

## Troubleshooting

diagnose(symptom) => fix {
  (model not found, local) => the model must be open in Power BI Desktop
  (model not found, remote) => verify the connection parameters; run `pql-test auth login`
  (tests not discovered) => confirm PQL.Assert is installed in the model, suite names follow `<Suite>.<ENV>.Tests`, and compatibility level >= 1702
  (connection failed) => service principal needs workspace access; XMLA endpoint must be reachable
}

## CI/CD

See [references/cicd-examples.md](references/cicd-examples.md) for GitHub Actions and Azure DevOps pipelines.

## Related Skills

- /pql-assert — PQL.Assert DAX assertion library reference
- /semantic-model-authoring — semantic model authoring and DAX query guidelines (`references/dax-guidelines.md`)

Commands {
  🧪 /pql-test run - run suites against a model, optionally scoped by --env
  🔎 /pql-test discover - list test suites without executing them
  📊 /pql-test coverage - report which model objects have direct test evidence
  🔑 /pql-test auth - check or establish authentication
}
