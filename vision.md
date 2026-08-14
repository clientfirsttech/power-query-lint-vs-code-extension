# Vision: Power Query Lint VS Code Extension

## Purpose

A Visual Studio Code extension providing comprehensive Power Query linting and semantic model testing capabilities through Model Context Protocol (MCP) integration.

## Core Capabilities

### 1. Power Query Linting
- Lint Power Query M code and TMDL for best practice violations
- AI-driven automated fix suggestions via the `pqlint-mcp` server
- Workspace-wide and single-document linting commands

### 2. Semantic Model Testing (PQL.Assert)
- DAX-based unit testing library for Power BI semantic models
- Assertion functions covering values, columns, tables, relationships, and best practices
- Environment-aware test discovery (DEV, TEST, PROD, ANY)
- RLS-aware test execution with user impersonation

### 3. Test Execution (pql-test)
- CLI/PyPI tool for automated test discovery and execution
- Support for local Power BI Desktop instances and Fabric XMLA endpoints
- JSON output for CI/CD pipeline integration
- Environment-scoped test filtering

---

## Folder Structure Distinction

### `/skills/` — Extension Deployment Skills
**These skills ship with the VS Code extension** via the `chatSkills` contribution in `package.json`.

| Skill | Purpose |
|-------|---------|
| `pql-assert` | PQL.Assert DAX assertion library reference |
| `dax-query-guidelines` | DAX query language best practices |
| `pql-test` | pql-test CLI usage and integration |

### `/resources/agents/` — Extension Deployment Agents
**These agents ship with the VS Code extension** via the `chatAgents` contribution.

| Agent | Purpose |
|-------|---------|
| `PQL - Linter` | Lints and fixes Power Query M / TMDL code |
| `PQL - Tester` | Creates and runs semantic model tests |

### `/.github/skills/` — Development Workflow Skills (NOT DEPLOYED)
**These skills support the AIDD development workflow** for this repository. They are NOT included in the packaged extension and are NOT deployed to end users.

Examples: `aidd-*` skills, `pql-test` development integration, CI/CD metadata.

---

## Target Users

1. **Power BI Developers** writing Power Query M code in `.pq` / `.pqm` files
2. **Semantic Model Authors** using TMDL in `.pbip` projects
3. **Data Engineers** building CI/CD pipelines for Power BI artifacts
4. **Quality Engineers** establishing test automation for semantic models

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Extension Runtime | VS Code Extension API (TypeScript) |
| Linting Engine | `pqlint-mcp` HTTP MCP Server |
| Test Functions | PQL.Assert DAX Library |
| Test Execution | `pql-test` PyPI Package (Python) |
| Model Connectivity | `powerbi-modeling-mcp` MCP Server |

---

## Constraints

### Hard Constraints
1. **No credentials in repository** — workspace IDs, subscription keys supplied at runtime
2. **Skills must be self-contained** — no external dependencies in deployed skill files
3. **Agents must declare tool access** — explicit `tools:` frontmatter
4. **PQL.Assert BP functions use 5-column schema** — never UNION with standard 4-column tests

### Soft Guidelines
1. Prefer targeted fixes over whole-query rewrites when applying linting corrections
2. Validate function names against DAX reserved words before creation
3. Instruct users to reload `.pbip` after TMDL function changes

---

## Success Metrics

- Users can lint Power Query code with zero configuration after installing the extension
- Users can create and run semantic model tests using Copilot chat
- Test results integrate with CI/CD pipelines via structured JSON output
- All deployed skills and agents are discoverable in VS Code Copilot

---

## Roadmap

### Phase 1 — Current (v0.9.x)
- ✅ Power Query linting via `pqlint-mcp`
- ✅ PQL.Assert library documentation skill
- ✅ DAX query guidelines skill
- ✅ Linter and Tester agents

### Phase 2 — Planned (v1.0.x)
- 🔲 `pql-test` skill for CLI test execution
- 🔲 CI/CD pipeline examples in documentation
- 🔲 Enhanced best practice rule coverage

### Phase 3 — Future
- 🔲 Inline diagnostics for Power Query files
- 🔲 Test coverage visualization
- 🔲 Performance profiling integration
