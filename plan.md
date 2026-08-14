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
- [ ] Skill appears in VS Code Copilot skill discovery (requires extension install)

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
