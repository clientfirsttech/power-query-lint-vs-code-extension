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
- [x] Plan.md and agent file are committed

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

---

## Fix PQL - Tester Agent: Actually Use `pql-test` Instead of Silent MCP Fallback

**Goal**: Fix the `PQL - Tester` agent so it reliably uses `pql-test` for test discovery/execution when available, and surfaces a clear message instead of silently falling back to MCP.

### Background

The agent was updated to prefer `pql-test`, but testing on another machine showed it still used `powerbi-modeling-mcp` DAX query operations. Likely causes:

1. **Missing `execute` tool declaration**: The agent frontmatter declares `tools: ['read', 'agent', 'edit', 'search', 'powerbi-modeling-mcp/*']` but `isPqlTestAvailable()` calls `call_tool("execute", ...)`. If `execute` is not declared, the availability check fails and the agent silently falls back to MCP.
2. **Fragile availability detection**: `pql-test --version` requires the CLI to be on PATH. A user may have it installed in a venv that the agent shell does not inherit.
3. **Silent fallback**: When `pql-test` is missing, the agent falls back to MCP without telling the user why or how to enable `pql-test`.

### Tasks

#### 1. Add `execute` Tool to Agent Frontmatter
**Status**: ✅ Done

Update frontmatter so the agent can run shell commands:
```yaml
tools: ['read', 'agent', 'edit', 'search', 'execute', 'powerbi-modeling-mcp/*']
```
`execute` is the VS Code agent tool alias for running shell/terminal commands.

#### 2. Make `pql-test` Availability Detection Robust
**Status**: 🔲 Not Started

- Try `pql-test --version` first.
- Fallback to `python -m pql_test --version` (or equivalent module invocation) in case the CLI entry point is not on PATH.
- Return the detected command prefix (`"pql-test"` or `"python -m pql_test"`) so execution uses the same path.

#### 3. Surface Clear Fallback Messaging
**Status**: 🔲 Not Started

When `pql-test` is not detected:
- Do **not** silently fall back to MCP for bulk discovery/execution.
- Tell the user `pql-test` was not found and provide concise install instructions.
- Only fall back to MCP if the user explicitly asks to run in DAX Query View or the request is for a single test function.

#### 4. Update `runAllTests` and `discoverAllTests` to Use Detected Command
**Status**: 🔲 Not Started

Pass the detected command prefix into `runPqlTestExecution`/`runPqlTestDiscovery` so the actual invocation matches the availability probe.

#### 5. Validate Packaging
**Status**: 🔲 Not Started

- `npm run compile`
- `npm run package`
- Verify agent file is included

### Acceptance Criteria

- [x] Agent frontmatter declares the `execute` tool
- [ ] `pql-test` availability is detected via CLI and module fallback
- [ ] Missing `pql-test` produces a clear message with install instructions instead of silent MCP fallback
- [ ] When `pql-test` is available, discovery/execution requests invoke it
- [ ] Extension compiles and packages without errors
- [ ] Changes are committed

### Dependencies

| Dependency | Status |
|------------|--------|
| `pql-test` skill | ✅ Exists |
| Updated PQL - Tester agent | ✅ Exists |

### Out of Scope

- Changing `pql-test` skill content
- Bundling `pql-test` with the extension
- Publishing a new version (do after validation)

## Support Both Claude Code and GitHub Copilot

**Goal**: Make the PQL skills and agents (and the AIDD dev workflow) load and behave the same in Claude Code and in VS Code Copilot, from one source of truth, without hand-copying files into per-user folders.

### Background

Today only Copilot in VS Code loads our content: the extension contributes `chatAgents` and `chatSkills` in `package.json`, and `configureMcpSettings()` writes the `pqlint-mcp` server into VS Code settings. Claude Code ignores all of that. It loads skills from `~/.claude/skills/`, `.claude/skills/`, or an installed plugin, and agents from `.claude/agents/` or a plugin's `agents/` folder.

Findings that shape the plan:

1. **`skills/` is already a Claude plugin layout.** Each skill is `skills/<name>/SKILL.md`. Adding `.claude-plugin/plugin.json`, an `agents/` folder, and a `.mcp.json` makes the repo installable as a Claude Code plugin with no duplicated skill files.
2. **Agent frontmatter differs.** Copilot uses `name: "PQL - Tester"` and `tools: ['read','agent','edit','search','execute','powerbi-modeling-mcp/*']`. Claude uses a lowercase-hyphen `name` (for example `pql-tester`) and Claude tool names (`Read`, `Edit`, `Grep`, `Glob`, `Bash`, `Task`, MCP tools as `mcp__<server>__<tool>`). One file cannot satisfy both, so agents need two frontmatter variants over a shared body.
3. **MCP wiring differs.** VS Code settings (`mcp.servers`, `mcp.inputs`) versus a Claude `.mcp.json`. `powerbi-modeling-mcp` runs over stdio via `npx -y @microsoft/powerbi-modeling-mcp@latest --start`. `pqlint-mcp` is HTTP at `https://pqlint.com/api/mcp` with an `Ocp-Apim-Subscription-Key` header, which must come from an environment variable in Claude (no `${input:...}` prompt).
4. **Dev-time AIDD skills are Copilot-pathed.** `.github/skills/*` and `.github/agents/aidd.agent.md` hard-code `.github/skills/...` paths and Copilot tool names. Claude does not read `.github/skills`. `.vscode/settings.json` already enables `.claude/skills` in `chat.agentSkillsLocations`, so a single `.claude/skills/` location can serve both tools.
5. **Missing shared instructions.** There is no `CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md` (the AIDD agent references the last one, but it does not exist).
6. **Stale hand-copies exist.** VS Code's synced-customization plugin folders hold several old copies of `pql-test`/`pql-assert` (one at `pql-test` 0.1.13). Copying them into `~/.claude/skills` would ship stale content. A plugin install supersedes this.
7. **Tool-specific body text.** The tester agent and `pql-assert` mention VS Code-specific behavior and the MCP tool `dax_query_operations`. These need a tool-neutral wording or a clearly marked per-tool note.
8. **Existing alternative.** `pql-test skill --install claude|copilot` already installs the CLI's own skill. Keep it documented as a fallback, but it is not a substitute for our agents.

### Tasks

#### 1. Spike: confirm both tools' contracts (blocks everything else) — DONE 2026-10-14

**Decisions (from the user)**: one shared source with a generator; scope is the PQL skills and agents only (the AIDD dev workflow is out of scope); Claude agents are named `pql-tester` and `pql-linter`; no Claude marketplace publishing for now.

**Claude Code** (docs at code.claude.com/docs/en/…):

- Plugin manifest is `.claude-plugin/plugin.json`; only `name` (kebab-case, must not start with `claude-` or `anthropic-`) is required. Optional: `version`, `description`, `author` (object), `license` (SPDX), `repository`, `homepage`. **Setting `version` pins users to it until it changes, so it must be bumped every release.**
- Components live at the plugin root, not inside `.claude-plugin/`: `skills/<name>/SKILL.md` is auto-discovered (our layout already works), `agents/`, `.mcp.json`. Setting the `agents` key replaces the default scan and takes `.md` file paths, not directories.
- `claude --plugin-dir <path>` loads a plugin for one session. `claude plugin validate <path> [--strict]` is the authoritative check and can run in CI. Installing from GitHub needs a `marketplace.json` (`/plugin marketplace add owner/repo`, then `/plugin install`); this plan does not publish one.
- Agent frontmatter: `name`, `description` required; `tools` is a comma string or YAML list; unknown keys are ignored. Tool names: `Read`, `Edit`, `Write`, `Grep`, `Glob`, `Bash`, `Agent` (`Task` still works), `TodoWrite`. Plugin agents are namespaced `<plugin>:<agent>`. **Plugin agents ignore `mcpServers`, `hooks`, and `permissionMode`.**
- MCP tool names: `mcp__<server>__<tool>`; `mcp__<server>` or `mcp__<server>__*` grants a whole server. **For plugin-bundled servers the name is `mcp__plugin_<plugin>_<server>__<tool>`; wildcard use on that form is not documented and must be tested.**
- Skill frontmatter: unknown keys such as `version` are ignored in Claude Code (but are a hard error for claude.ai uploads and the Skills API, which we do not use). **The hide-from-menu key is `user-invocable` (not `user-invokable`); `disable-model-invocation` hides a skill from the model.**
- `.mcp.json`: stdio uses `command`/`args`/`env`; HTTP uses `"type": "http"`, `url`, `headers`. `${VAR}` and `${VAR:-default}` expand in `command`, `args`, `env`, `url`, and `headers`. `${CLAUDE_PLUGIN_ROOT}` also works there.
- `${CLAUDE_PLUGIN_ROOT}` is substituted inside the Markdown body of skills and agents, so bodies can reference plugin files for Claude. It is not available in Bash commands. Supporting files in a skill (such as `references/`) are not auto-loaded; `SKILL.md` must say when to read them (ours already do).
- A plugin-root `CLAUDE.md` is not loaded.

**VS Code Copilot** (code.visualstudio.com/docs/copilot/customization/…):

- Agents are read from `.github/agents`, `.claude/agents` (Claude format, comma-separated tools), `~/.copilot/agents`, and `~/.claude/agents`. VS Code maps Claude tool names to its own tools (the mapping table is not published).
- Skills are read from `.github/skills`, `.claude/skills`, `.agents/skills` and the matching `~/` folders. **`chat.agentSkillsLocations` is deprecated and not read by Copilot harness sessions.** `name` must match the parent folder.
- Skill keys: `name`, `description`, `argument-hint`, `user-invocable`, `disable-model-invocation`, `context`. Agent keys: `description`, `name`, `argument-hint`, `tools`, `agents`, `model`, `user-invocable`, `disable-model-invocation`, `target`, `mcp-servers`, `handoffs`, `hooks`. Handling of unknown keys such as `version` is not documented.

**Consequences for the plan**:

1. `pql-assert` declares `user-invokable: false`, which both tools ignore. Fix it to `user-invocable: false`.
2. Plugin name: `power-query-lint`. The Claude MCP tool prefix becomes `mcp__plugin_power-query-lint_<server>__*`, so the Claude agent variants must use that form (verify in Task 8).
3. Because plugin agents ignore `mcpServers`, MCP servers must come from the plugin `.mcp.json`, not from agent frontmatter.
4. Agent bodies need a per-tool path rule: `${CLAUDE_PLUGIN_ROOT}/skills/...` for Claude, relative paths for Copilot. The generator substitutes this.
5. Without a marketplace, Claude users load the plugin with `claude --plugin-dir <clone>` or use `pql-test skill --install claude`. Revisit if broader distribution is wanted.
6. Add `claude plugin validate --strict` to CI and to Task 8.
7. Unverified items to test early in Task 3: whether Copilot's `chatAgents` contribution accepts Claude-format files, whether `version` is tolerated in Copilot frontmatter, and whether the `skills:` key in the tester agent works in Claude (plugin skills are namespaced `<plugin>:<skill>`).

#### 2. Choose and document the source-of-truth layout — DONE 2026-10-14

Implemented: `agent-src/agents.json` + `agent-src/<id>.body.md`, built by `scripts/build-agents.js` (`npm run build:agents`, `npm run check:agents`, run from `vscode:prepublish` and from the `postbump` release hook). Placeholders: `{{skill:…}}`, `{{tool:…}}`, `{{#copilot}}…{{/copilot}}`. The Copilot output is byte-identical to the previous files except for removing two hard-coded `c:/Users/JohnKerski/...` path fallbacks that were shipping in the tester agent.

Recommended: keep `skills/` as canonical for shipped skills (already shared). For agents, keep one shared body per agent and generate the two frontmatter variants with a small script in `scripts/` (`resources/agents/` for Copilot, `agents/` for Claude), run from `npm run compile`/`prepublish` and checked in CI so the two never drift. Alternative to reject unless the spike says otherwise: two hand-maintained copies.

#### 3. Claude Code plugin packaging — DONE 2026-10-14

Implemented: `.claude-plugin/plugin.json` (references `./.claude-plugin/mcp.json`), `.claude-plugin/mcp.json`, generated `agents/pql-linter.md` and `agents/pql-tester.md`, `.vscodeignore` exclusions (verified with `vsce ls`). Findings: (a) a root-level `.mcp.json` is also read as this repo's own project config (approval prompts, missing-env warning), so the plugin MCP file lives in `.claude-plugin/`; (b) verified with Claude Code 2.1.299: `claude plugin validate . --strict` passes, agents load as `power-query-lint:pql-linter` / `power-query-lint:pql-tester`, skills as `power-query-lint:pql-assert` / `pql-test` / `semantic-model-authoring`, both plugin MCP servers connect (the first `npx` cold start exceeded 30 s once), and the plugin tool-name form `mcp__plugin_power-query-lint_<server>__<tool>` is confirmed for `pqlint-mcp`; (c) `powerbi-modeling-mcp` exposes `dax_query_operations` and `model_operations`, matching the generator tokens, but its tools did not surface in a headless `-p` session, so the Claude-side tool names for that server are still to be confirmed interactively (Task 8). The Claude `skills:` list is omitted from the tester agent until verified.

- Add `.claude-plugin/plugin.json` (name `power-query-lint`, version, description, author, license `BUSL-1.1`, repository). No `marketplace.json` for now.
- Add `.mcp.json` for `powerbi-modeling-mcp` (stdio) and `pqlint-mcp` (HTTP, key from `OCP_APIM_SUBSCRIPTION_KEY`).
- Add Claude agent variants of `PQL - Linter` and `PQL - Tester` with mapped tool names and lowercase-hyphen names.
- Resolve file references in agent bodies (for example `skills/pql-assert/references/reserved-dax-words.md`) so they work from the plugin root in both tools.
- Exclude plugin-only files from the `.vsix` in `.vscodeignore` (and keep `THIRD_PARTY_NOTICES.md` shipping in both).

#### 4. Keep the Copilot path working — DONE 2026-10-14 (README and CONTRIBUTING updated)

- No behavior change to `chatAgents`/`chatSkills`/`configureMcpSettings`.
- Keep `README.md` and `CONTRIBUTING.md` accurate: "Install in VS Code" and "Install in Claude Code" sections, including setting the subscription key env var for Claude.

#### 5. Shared instructions

- Add `AGENTS.md` as the single instructions file (build/lint/test commands, SudoLang skill style, skill/agent layout, license notes).
- Add a thin `CLAUDE.md` that imports it, and add `.github/copilot-instructions.md` that points to it. This fixes the dangling reference in `aidd.agent.md`.

#### 6. Dev-time AIDD for both tools — OUT OF SCOPE (decided 2026-10-14)

Kept for reference only. Skip unless scope changes.

- Decide the location of the AIDD skills: move or mirror `.github/skills/aidd-*` to `.claude/skills/` (already enabled for Copilot in `.vscode/settings.json`) so one copy serves both. Avoid symlinks (Windows) unless the team has them enabled.
- Add a Claude variant of `.github/agents/aidd.agent.md` (`.claude/agents/aidd.md`) with Claude tool names (`Read, Edit, Grep, Glob, Bash, Task, TodoWrite`) and the same command table.
- Make the AIDD agent's file-path instructions location-neutral, and fix `aidd-workflow` (it is still labeled "fabric-ci-cd-dataops").

#### 7. Version and release sync — DONE 2026-10-14

Done: `plugin.json`, all four agent files, both skills, `package.json` and the lockfile bump together (verified by `standard-version --dry-run`); `postbump` regenerates agents. CI: `.github/workflows/ci.yml` runs `check:agents`, `check:versions` (`scripts/check-versions.js`), lint, compile, `npm audit --omit=dev`, and `vsce ls` on every push to `main` and every PR, plus a non-blocking `claude plugin validate . --strict` job. Promote the plugin job to blocking after it has passed once in CI (it has not run in CI yet, and it assumes `claude plugin validate` works unauthenticated, which it did locally).

- Add `.claude-plugin/plugin.json` to `.versionrc.json` `bumpFiles` so `npm run release` keeps every version in step, including the new Claude manifests.
- Add a CI check that `package.json`, plugin manifest, skill, and agent versions all match, and run `claude plugin validate . --strict`.

#### 5b. Opt-in Claude Code registration from the extension — DONE 2026-10-15

Decision: opt-in with a choice. On first activation, if Claude Code is detected, the extension asks once (Enable / Not now / Don't ask again). Commands `Power Query: Enable for Claude Code` and `Power Query: Remove from Claude Code`; setting `powerQueryLint.claudeCode.promptOnStartup`. Implementation: `src/claudeCli.ts` (CLI logic, no vscode import) and `src/claudeCode.ts` (prompt, commands, refresh-after-consent). Mechanism: a local-only marketplace (`.claude-plugin/marketplace.json`, name `power-query-lint-extension`) pointing at the extension folder, registered with `claude plugin marketplace add <extensionPath> --scope user` and `claude plugin install power-query-lint@power-query-lint-extension --scope user`. After consent, activation silently re-points and updates the plugin when the extension version or folder changes. The CLI is the Claude Code VS Code extension's bundled binary, else `claude` on PATH, else the user is shown the two commands. Tested with the real CLI in an isolated `CLAUDE_CONFIG_DIR`: enable, idempotent re-enable, upgrade (new folder + version), disable. Not yet exercised: the VS Code prompt UI itself (needs Task 8).

#### 8. Validation (manual, since the repo has no automated tests)

- Claude Code, via the extension: on first activation the prompt appears when Claude Code is installed; choose Enable and confirm `claude plugin list` shows `power-query-lint@power-query-lint-extension`; also check Not now / Don't ask again behave, and that `Power Query: Remove from Claude Code` removes it. Developer shortcut: `claude --plugin-dir .` loads; `/agents` lists `pql-tester` and `pql-linter`; `/skills` lists `pql-assert`, `pql-test`, `semantic-model-authoring`; run a discovery request end to end against `examples/`; confirm both MCP servers connect.
- Copilot: Ctrl+F5 Development Host shows the same agents and skills; same end-to-end request.
- Install on a clean machine/profile in each tool; confirm the `version:` frontmatter matches the extension version.

### Acceptance Criteria

- [ ] Given the repo is installed as a Claude Code plugin, should list the PQL agents and all three shipped skills
- [ ] Given the VS Code extension is installed, should list the same agents and skills with unchanged behavior
- [ ] Given a version bump via `npm run release`, should update `package.json`, lockfile, both plugin manifests, skills, and agents together
- [ ] Given an agent body changes, should regenerate both frontmatter variants with no drift (CI fails otherwise)
- [ ] Given a Claude user without the VS Code extension, should be able to run `pql-test` discovery and execution via `pql-tester` using only the plugin
- [ ] Given the plugin is installed, should not require copying files into `~/.claude/skills`
- [ ] Given the `.vsix` is built, should not include plugin-only files and should still include `THIRD_PARTY_NOTICES.md`

### Dependencies

| Dependency | Status |
|-----------|--------|
| Claude Code plugin/marketplace and agent schema confirmed (Task 1) | Pending |
| `pqlint-mcp` accepts a key from an env var in Claude `.mcp.json` | Pending (verify) |
| Skills and agents carry a `version:` field | Done |
| `THIRD_PARTY_NOTICES.md` and MIT attribution for `semantic-model-authoring` | Done |

### Open Questions

1. Minimum Claude Code and VS Code versions to support (plugin install needs a recent Claude Code; confirm when writing the README).
2. Without a marketplace, is `--plugin-dir` plus `pql-test skill --install claude` enough for Claude users, or should a marketplace entry be added later?

### Out of Scope

- Changing assertion or CLI behavior
- Supporting other assistants (Cursor, Windsurf, Codex), although `pql-test skill --install` already covers them
- Publishing a release (do after validation)
