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
