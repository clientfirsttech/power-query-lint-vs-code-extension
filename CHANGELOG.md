# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.7.1](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.7.0...v0.7.1) (2026-03-12)


### Bug Fixes

* fixViolation step 31 now retrieves AIFixInstructions and ErrorInformation directly from State.lintResults (populated during linting) instead of calling get_lint_rules; falls back to get_lint_rules only when the data is missing

## [0.7.0](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.6.1...v0.7.0) (2026-03-11)


### Features

* update power query linter agent with AIFixInstructions and ErrorInformation interfaces aligned to PQLint API OpenAPI spec (RuleResult PascalCase fields: ID, Name, Category, Description, Severity, Passed; ErrorInformation with nested errorLocation/positionStart/positionEnd; added ErrorPosition and Rule interfaces)
* agent now prompts user to apply fixes after linting before modifying any TMDL or Power Query code
* agent guards fix application — only executes when AIFixInstructions.IsActive is true and Prompt is non-empty; skips silently when no fix is available
* agent uses ErrorInformation.errorLocation.positionStart.lineNumber to target the correct line for non-whole-query fixes

### [0.6.1](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.6.0...v0.6.1) (2026-03-09)

## [0.6.0](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.5.1...v0.6.0) (2026-03-04)


### Features

* add reserved DAX words reference file to pql-assert skill
* update pql-assert skill with reserved DAX words guidance
* update power query tester agent to reference reserved DAX words

### [0.5.1](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.5.0...v0.5.1) (2026-03-04)


### Bug Fixes

* update version references

## [0.5.0](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.4.2...v0.5.0) (2026-03-03)


### Features

* add schema difference notation to pql-assert skill

### [0.4.2](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.4.1...v0.4.2) (2026-03-02)

### [0.4.1](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.4.0...v0.4.1) (2026-02-28)


### Bug Fixes

* handle case where DAXQueries function name is not yet defined in power query tester agent

## [0.4.0](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.3.5...v0.4.0) (2026-02-28)


### Features

* adjust testing agent to instruct adding new functions to functions.tmdl

### [0.3.5](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.3.4...v0.3.5) (2026-02-27)


### Features

* update power query tester agent with correct DAX folder implementation guidance

### [0.3.4](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.3.3...v0.3.4) (2026-02-27)


### Features

* adjust power query tester instructions ([a901172](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/commit/a901172f8b7006df401f26c603bab09ea840888b))

### Bug Fixes

* update README with correct Power BI Model MCP reference

### [0.3.3](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.3.2...v0.3.3) (2026-02-25)

### [0.3.2](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.3.1...v0.3.2) (2026-02-25)


### Bug Fixes

* fix to creating tests in power query tester agent and pql-assert skill
* update README

### [0.3.1](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.3.0...v0.3.1) (2026-02-25)

## [0.3.0](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.2.3...v0.3.0) (2026-02-25)


### Features

* moved fucntions.tmdl into skills ([7f6f7b7](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/commit/7f6f7b736294cde7b511fe48ba5bf8ea9b7fe2cb))

### [0.2.3](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.2.2...v0.2.3) (2026-02-24)


### Bug Fixes

* documentation for public consumption ([635856b](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/commit/635856b8fc62421c27ead3de568857681ba41f97))

### [0.2.2](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.2.1...v0.2.2) (2026-02-24)


### Bug Fixes

* documentation on capabilities ([fd20349](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/commit/fd2034959422c7d5b80311fb16e7c391d31cb085))

### [0.2.1](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.2.0...v0.2.1) (2026-02-20)


### Features

* update linter and tester agent instructions; remove legacy agent file

## [0.2.0](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.1.0...v0.2.0) (2026-02-20)


### Features

* add custom agent mode installs for power query linter and tester; add power-query-linter.md and power-query-tester.md agent instruction files; update package.json for new agent registration

## [0.1.0] (2026-02-20)


### Features

* initial MCP server registration; add README, agent instructions, extension icon; restructure package to support VS Code MCP extension pattern

## 0.1.0 (2026-02-20)

## [0.0.1] - 2026-02-13

### Added
- Initial release of Power Query Lint VS Code extension
- Basic Power Query language support (.pq, .pqm files)
- Lint Document command
- Lint Workspace command
- MCP (Model Context Protocol) server integration
- Two MCP tools: `lint_powerquery` and `analyze_powerquery`
- Configuration settings for enabling/disabling features
- VS Code debug configuration
- Comprehensive documentation and setup instructions

### Security
- Updated @modelcontextprotocol/sdk to version 1.25.2 to address:
  - ReDoS vulnerability (CVE addressed in 1.25.2)
  - DNS rebinding protection not enabled by default (CVE addressed in 1.24.0)

### Features
- Language support for Power Query with syntax highlighting configuration
- MCP server for AI agent integration
- Extensible architecture for future linting rules

### Documentation
- Complete README with installation instructions
- MCP server setup guide for Claude Desktop and other clients
- Development and contribution guidelines
