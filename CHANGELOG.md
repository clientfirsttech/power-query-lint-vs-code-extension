# Change Log

All notable changes to the "power-query-lint" extension will be documented in this file.

## [Unreleased]

### Added
- **`pql-test` CLI** — command-line tool for discovering and executing `PQL.Assert` tests from PBIP models
  - `retrieve-tests <modelPath>` — list all tests (encapsulates `PQL.Assert RetrieveTests`)
  - `retrieve-test <modelPath> <name>` — retrieve a single test by name (encapsulates `PQL.Assert RetrieveTestByName`)
  - `run-tests <modelPath> [--test <name>]` — execute all tests or a specific named test
  - `check-prereqs` — verify Node.js and npm prerequisites
  - `--verbose` flag for detailed output (file paths, assertion descriptions, durations)
- **`src/pql-test-runner.ts`** — core library with `retrieveTests()`, `retrieveTestByName()`, `runTest()`, `runTests()`, and `runTestsFromModel()` functions
- **`examples/samplemodel/`** — sample PBIP model with three `PQL.Assert` test files demonstrating the expected folder structure
- **`scripts/check-prereqs.js`** — prerequisite check script (runs automatically on `npm install` via `postinstall`)
- Test suite (45 tests) using Node.js built-in `node:test` runner covering the core library and CLI

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
