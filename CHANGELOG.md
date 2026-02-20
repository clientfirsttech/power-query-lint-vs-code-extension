# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.2.0](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/compare/v0.1.0...v0.2.0) (2026-02-20)

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
