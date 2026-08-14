# Plan: pql-test Skill Integration

**Goal**: Integrate the `pql-test` CLI documentation into the extension's deployed skills so users can discover, run, and automate semantic model tests.

---

## Understanding the Distinction

| Folder | Purpose | Deployed? |
|--------|---------|-----------|
| `/skills/` | Extension skills shipped to users | ✅ Yes |
| `/.github/skills/` | AIDD development workflow | ❌ No |

The `.github/skills/pql-test/SKILL.md` documents how this repository's CI/CD uses `pql-test` internally. The `/skills/pql-test/SKILL.md` must teach **extension users** how to use the tool.

---

## Tasks

### 1. Create `/skills/pql-test/SKILL.md` (User-Facing)
**Status**: ✅ Complete

Created skill file documenting:
- Installation with virtual environment setup (recommended)
- CLI usage patterns for local and remote models
- Environment-scoped test execution (DEV, STG, PRD, ANY)
- JSON output schema with exit codes
- CI/CD integration (GitHub Actions, Azure DevOps)
- Authentication options (service principal, interactive)

### 2. Update `package.json`
**Status**: ✅ Complete

Added `skills/pql-test/SKILL.md` to `contributes.chatSkills`.

### 3. Update PQL - Tester Agent
**Status**: ✅ Complete

Added `pql-test` to skills list: `skills: ['pql-assert', 'pql-test']`

### 4. Update `.github/skills/pql-test/SKILL.md` (Dev Workflow)
**Status**: ✅ Complete

Updated with accurate PyPI documentation including:
- Virtual environment installation instructions
- Correct CLI flags (`--tenant-id`, `--workspace-id`, `--dataset-id`, `--client-id`, `--client-secret`)
- Environment variables (`PQL_TENANT_ID`, `PQL_WORKSPACE_ID`, etc.)
- Additional commands (`auth login`, `retrieve-tests`)
- Exit codes and links

### 5. Validate Extension Packaging
**Status**: ✅ Complete

- `npm run compile` succeeded
- Skills directory contains: `dax-query-guidelines/`, `pql-assert/`, `pql-test/`

---

## Acceptance Criteria

- [x] `/skills/pql-test/SKILL.md` exists with complete CLI documentation
- [x] `package.json` registers the skill in `chatSkills`
- [x] PQL - Tester agent lists `pql-test` skill
- [x] Extension compiles without errors
- [x] `.github/skills/pql-test/SKILL.md` updated with accurate PyPI info
- [x] Skill appears in VS Code Copilot skill discovery (verified via VSIX packaging — `skills/pql-test/SKILL.md`, `skills/pql-assert/SKILL.md`, and `skills/dax-query-guidelines/SKILL.md` are all included in the package)

---

## Dependencies

| Dependency | Status |
|------------|--------|
| `pql-assert` skill | ✅ Exists |
| `dax-query-guidelines` skill | ✅ Exists |
| PQL - Tester agent | ✅ Exists |
| `pql-test` PyPI package | External (user installs) |

---

## Out of Scope

- Changes to `.github/skills/pql-test/SKILL.md` (development workflow)
- Changes to `scripts/invoke_pql_test.py` (CI/CD internal)
- Bundling the `pql-test` Python package in the extension

---

## PQL.Assert 0.5.0 Skill Update

**Goal**: Update the deployed `pql-assert` skill to the PQL.Assert DAX Library 0.5.0 release so users can discover and use the new assertion functions.

### Background

The local `skills/pql-assert/references/functions.tmdl` currently ships PQL.Assert **0.3.0**. PQL.Assert **0.5.0** is available from [DAX Lib](https://daxlib.org/package/PQL.Assert/) and adds new assertion categories:

- **Perspective Assertions**
  - `PQL.Assert.Perspective.ShouldExist(testName, perspectiveName)`
  - `PQL.Assert.Perspective.ShouldContain(testName, perspectiveName, expectedTablesList, expectedColumnsList, expectedMeasuresList)`
  - `PQL.Assert.Perspective.ShouldMatchSchema(testName, perspectiveName, expectedTablesList, expectedColumnsList, expectedMeasuresList)`

- **Partition Assertions**
  - `PQL.Assert.Partitions.ShouldExist(testName, tableName, partitionName)`
  - `PQL.Assert.Partitions.ShouldBe(testName, tableName, expectedPartitionCount)`
  - `PQL.Assert.Partitions.ShouldBeAtLeast(testName, tableName, minPartitionCount)`

- **Test Discovery Enhancements**
  - `PQL.Assert.RetrieveTestsV2()` and `PQL.Assert.RetrieveTestsByEnvironmentV2()` now return an additional `[PQLAssert_RoleName]` metadata column alongside `[PQLAssert_ImpersonatedUserName]`.

### Tasks

#### 1. Update `skills/pql-assert/references/functions.tmdl` to 0.5.0
**Status**: ✅ Complete

Replaced the embedded TMDL definitions with the official PQL.Assert 0.5.0 release from DAX Lib. All 101 functions now carry `DAXLIB_PackageVersion = 0.5.0` annotations.

#### 2. Update `skills/pql-assert/SKILL.md`
**Status**: ✅ Complete

Added documentation for:
- Perspective assertion functions (`PQL.Assert.Perspective.ShouldExist`, `ShouldContain`, `ShouldMatchSchema`)
- Partition assertion functions (`PQL.Assert.Partitions.ShouldExist`, `ShouldBe`, `ShouldBeAtLeast`)
- Updated V2 test discovery schema to include the `[PQLAssert_RoleName]` column
- Updated RLS/OLS execution guidance to reference `[PQLAssert_RoleName]`

#### 3. Document OLS Assertions (Existing Doc Gap)
**Status**: ✅ Complete

Added an Object Level Security (OLS) section documenting the table-level and column-level `PQL.Assert.OLS.*` functions that already existed in the TMDL. Included a TMDL role/permission example and a sample `DEFINE FUNCTION ... UNION(...)` runner.

#### 4. Validate Extension Packaging
**Status**: ✅ Complete

- `npm run compile` succeeded
- `skills/pql-assert/` remains registered in `package.json` `chatSkills`
- No broken skill references detected

### Acceptance Criteria

- [x] `skills/pql-assert/references/functions.tmdl` contains PQL.Assert 0.5.0 definitions
- [x] `skills/pql-assert/SKILL.md` documents all new 0.5.0 functions
- [x] `skills/pql-assert/SKILL.md` documents the existing `PQL.Assert.OLS.*` functions
- [x] `DAXLIB_PackageVersion` annotations read `0.5.0`
- [x] Extension compiles without errors
- [x] Skill remains registered in `package.json` `chatSkills`

### Dependencies

| Dependency | Status |
|------------|--------|
| PQL.Assert 0.5.0 release | ✅ Available on DAX Lib |
| Existing pql-assert skill | ✅ Exists |

### Out of Scope

- Implementing assertion logic changes (use official 0.5.0 TMDL verbatim)
- Changes to `pql-test` skill or agents
- Automated tests for the skill content

---

## PQL - Tester Agent: Use `pql-test` for Execution & Discovery

**Goal**: Update the `PQL - Tester` agent (`resources/agents/power-query-tester.sudo.md`) so it prefers the `pql-test` CLI for test discovery and execution workflows, falling back to MCP-based DAX execution only when `pql-test` is unavailable or the user explicitly requests in-model execution.

### Background

The agent currently:
- Lists `skills: ['pql-assert']` only — it does **not** load the `pql-test` skill.
- Routes retrieve/run/execute/list test requests to `runAllTests()` and `executeAndRetrieveTests()`, which call `mcp_powerbi-model_dax_query_operations` directly.
- Has no awareness of `pql-test run-tests`, `pql-test retrieve-tests`, environment filtering (`--env`), JSON output, or CI/CD log formats.

This means users who ask "retrieve tests" or "run all tests" get MCP-driven single-function execution rather than the environment-scoped, CI/CD-friendly `pql-test` workflow.

### Tasks

#### 1. Add `pql-test` Skill to Agent
**Status**: ✅ Complete

Updated agent frontmatter:
```yaml
skills: ['pql-assert', 'pql-test']
```

#### 2. Detect `pql-test` Availability
**Status**: ✅ Complete

Added `isPqlTestAvailable()` and `ensurePqlTestInstalled()` helpers. `isPqlTestAvailable()` checks `pql-test --version` on PATH; `ensurePqlTestInstalled()` guides the user through venv setup and `pip install pql-test` if missing.

#### 3. Prefer `pql-test` for Discovery
**Status**: ✅ Complete

Added `discoverAllTests()` which:
- Resolves the `*.SemanticModel` folder via `resolveModelPath()`
- Runs `pql-test retrieve-tests <modelPath>` when available
- Falls back to `EVALUATE PQL.Assert.RetrieveTestsByEnvironmentV2("")` via MCP when `pql-test` is unavailable

#### 4. Prefer `pql-test` for Execution
**Status**: ✅ Complete

Added `runPqlTestExecution()` and updated `runAllTests()` to:
- Extract environment from the request and pass `--env <env>`
- Support `--output <file>` via `extractOutputFile()`
- Support `--log-format github|azuredevops` via `extractLogFormat()`
- Fall back to MCP-based execution when `pql-test` is unavailable

#### 5. Update Command Handlers & Request Router
**Status**: ✅ Complete

- `on command "retrieve-tests"`: now calls `discoverAllTests()`
- `on command "run-all-tests"`: now calls `runAllTests(env, output, logFormat)`
- Router cases for `/run\s+(all\s+)?tests?/i`, `/execute\s+tests?/i`, and `/(find|discover|retrieve|list)\s+tests?/i` now route to the `pql-test`-preferring handlers

#### 6. Document Fallback Behavior
**Status**: ✅ Complete

Added a "Test Execution Mode" section near the top of the agent explaining when to use `pql-test` (discovery, bulk execution, CI/CD) vs. MCP direct execution (single-test debugging, `pql-test` missing, explicit DAX Query View request).

#### 7. Validate Packaging
**Status**: ✅ Complete

- `npm run compile` succeeded
- `npm run package` succeeded and produced `power-query-lint-1.0.0.vsix`
- Updated agent file is included in the package

### Acceptance Criteria

- [x] Agent frontmatter lists both `pql-assert` and `pql-test` skills
- [x] Retrieve/discover/list test requests prefer `pql-test retrieve-tests`
- [x] Run/execute test requests prefer `pql-test run-tests --env <env>`
- [x] Fallback to MCP-based execution is documented and implemented
- [x] Extension compiles and packages without errors
- [ ] Plan.md and agent file are committed

### Dependencies

| Dependency | Status |
|------------|--------|
| `pql-test` skill | ✅ Exists |
| `pql-assert` skill | ✅ Exists |
| PQL - Tester agent | ✅ Exists |

### Out of Scope

- Modifying the `pql-test` skill content
- Adding new MCP tools
- Bundling Python/pql-test in the extension
