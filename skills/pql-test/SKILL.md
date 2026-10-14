---
name: pql-test
version: 1.2.1
description: pql-test CLI tool for running PQL.Assert DAX tests against Power BI semantic models. Use when executing tests locally or in CI/CD pipelines, discovering tests by environment, measuring test coverage, or integrating test results with automation workflows.
---

# pql-test — Semantic Model Test Execution CLI

CLI for discovering and running DAX tests in Power BI PBIP semantic models via XMLA. Windows, Python ≥ 3.9. Latest at time of writing: `0.1.19` ([PyPI](https://pypi.org/project/pql-test/)).

> **The CLI is the source of truth for its own usage.** Run `pql-test --help` or `pql-test <command> --help` for flags, and `pql-test skill --show` for the maintained assistant skill. This file only covers how the agent should drive the CLI.

## Steps

1. **Check availability** — run `pql-test --version`. If not found, create a venv and install via the venv's own pip (see Installation). Then run `pql-test check-prereqs`.
2. **Check auth** — if the user's request mentions "workspace", run `pql-test auth status`. If unauthenticated, run `pql-test auth login` before proceeding.
3. **Resolve model path** — if an explicit path is in the prompt, use it. If "workspace" is mentioned, extract the workspace name and model name from the prompt and build `<workspace>.Workspace/<model>.SemanticModel`. Only scan the local filesystem when no workspace is implied.
4. **Run the command** — always quote the model path.

| Goal | Command |
|------|---------|
| Discover suites | `pql-test retrieve-tests "<modelPath>" [--env ENV]` |
| Inspect one suite | `pql-test retrieve-test "<modelPath>" <name> --verbose` |
| Run suites | `pql-test run-tests "<modelPath>" [--env ENV] [--test NAME] [--output results.json]` |
| Test coverage | `pql-test code-coverage "<modelPath>" [--min-coverage PCT]` |

## Installation

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1   # macOS/Linux: source .venv/bin/activate
pip install pql-test         # pin in CI: pip install pql-test==<version>
pql-test --version
pql-test check-prereqs
```

ADOMD.NET is downloaded automatically on first use (disable with `PQL_TEST_NO_AUTO_INSTALL_ADOMD=1`).

## Assistant Skill Files

`pql-test skill` prints or installs the maintained skill file for AI assistants:

```bash
pql-test skill --list                 # available skills / harnesses
pql-test skill --show                 # print skill content
pql-test skill --install claude       # also: copilot, cursor, windsurf (or --all)
pql-test skill --install copilot --dry-run
```

Locally customized skill files are preserved unless `--force` is passed.

## Model Paths

| Format | Mode |
|--------|------|
| `<workspace>.Workspace/<model>.SemanticModel` | Fabric service, by display names |
| `local/<model_name>` | Open Power BI Desktop instance |
| `<filesystem_path>` | PBIP root or `.SemanticModel` folder |

Quote any path with spaces or parentheses: `pql-test run-tests "My Workspace.Workspace/Sales (2024).SemanticModel" --env DEV`

## Test Conventions

- **Location:** `*.SemanticModel/DAXQueries/`
- **Naming:** `<Suite>.<ENV>.Tests.dax` (e.g., `Calculations.DEV.Tests.dax`). `--env` matches the `<ENV>` segment and `ANY` suites exactly, case-insensitively.
- **Schemas:** standard suites return 4 columns; `PQL.Assert.BP.*` returns 5. Never UNION them — keep BP suites in their own file. See the **pql-assert** skill.

## Authentication

Resolution order: CLI flags → `PQL_*` environment variables (`PQL_TENANT_ID`, `PQL_WORKSPACE_ID`, `PQL_DATASET_ID`, `PQL_CLIENT_ID`, `PQL_CLIENT_SECRET`; `.env` files are loaded) → stored credentials (OS keyring).

- `pql-test auth login` — interactive browser, service principal (secret or certificate), or managed identity (`--identity`); `--environment <cloud>` for sovereign clouds.
- `pql-test auth status` / `auth logout` — inspect or clear stored credentials.
- RLS/OLS tests: use `ImpersonateRole:` (recommended) for OLS; `ImpersonateUser:` requires workspace Admin on service connections.

## Results and Exit Codes

`--output <file>` writes JSON (`passed`, `failed`, `skipped`, `total`, `results[]`). `--log-format azuredevops|github` emits native pipeline annotations.

| Command | `0` | `1` | `2` |
|---------|-----|-----|-----|
| `run-tests` | all passed or none discovered | failures, missing prerequisite, or all skipped | — |
| `code-coverage` | success | no connection or below `--min-coverage` | usage error |

## CI/CD

See [references/cicd-examples.md](references/cicd-examples.md) for GitHub Actions and Azure DevOps pipelines.

## Troubleshooting

- **Model not found** — local: model must be open in Power BI Desktop; remote: check the connection parameters; interactive: run `pql-test auth login`.
- **Tests not discovered** — confirm PQL.Assert is installed in the model, suite names follow `<Suite>.<ENV>.Tests`, and compatibility level ≥ 1702.
- **Connection failed** — service principal needs workspace access; XMLA endpoint must be reachable.

## Related Skills

- **pql-assert** — PQL.Assert DAX assertion library reference
- **semantic-model-authoring** — semantic model authoring and DAX query guidelines (`references/dax-guidelines.md`)
