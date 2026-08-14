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
**Status**: 🔲 Not Started

Create a skill file that documents:
- What `pql-test` is (PyPI package for running DAX tests)
- Installation: `pip install pql-test`
- CLI usage patterns for different model types
- Environment-scoped test execution
- JSON output format for CI/CD
- Integration with PQL.Assert functions

**Key Difference from `.github/skills/pql-test/SKILL.md`**:
- The dev skill describes wrapper scripts (`scripts/invoke_pql_test.py`) specific to this repo
- The deployment skill teaches users the raw `pql-test` CLI commands

### 2. Update `package.json`
**Status**: 🔲 Not Started

Add the new skill to `contributes.chatSkills`:
```json
{
  "path": "skills/pql-test/SKILL.md"
}
```

### 3. Update PQL - Tester Agent
**Status**: 🔲 Not Started

Add `pql-test` to the skills list in `resources/agents/power-query-tester.sudo.md`:
```yaml
skills: ['pql-assert', 'pql-test']
```

### 4. Validate Extension Packaging
**Status**: 🔲 Not Started

- Run `npm run compile`
- Run `npm run package`
- Verify `skills/pql-test/SKILL.md` is included in `.vsix`

---

## Acceptance Criteria

- [ ] `/skills/pql-test/SKILL.md` exists with complete CLI documentation
- [ ] `package.json` registers the skill in `chatSkills`
- [ ] PQL - Tester agent lists `pql-test` skill
- [ ] Extension compiles and packages without errors
- [ ] Skill appears in VS Code Copilot skill discovery

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
