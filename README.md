# Power Query Lint VS Code Extension

Visual Studio Code Extension for Power Query linting and analysis with Model Context Protocol (MCP) support and semantic model test creation and execution.

## Features

- **Power Query Linting** — Lint `.pq` and `.pqm` files for best practice violations and potential issues
- **Workspace Linting** — Lint all Power Query files across the entire workspace in one command
- **Language Support** — Syntax highlighting and language configuration for Power Query M
- **MCP Integration** — Model Context Protocol support for AI agent workflows
- **Copilot Agents** — Built-in GitHub Copilot agents for linting (`PQL - Linter`) and semantic model testing (`PQL - Tester`)
- **Copilot Skills** — Agent skills for PQL.Assert documentation and DAX query guidelines

## Installation

### From VS Code Marketplace

Install directly from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ClientFirstTechnologies.power-query-lint):

```bash
code --install-extension ClientFirstTechnologies.power-query-lint
```

### Prerequisites

- Visual Studio Code 1.99.0 or higher
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension (required dependency)
- [Power BI Model MCP](https://marketplace.visualstudio.com/items?itemName=nicobijen.powerbi-model-mcp) extension — provides MCP tools for connecting to and querying Power BI Desktop, Analysis Services, and Fabric semantic models

## Usage

### Linting Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

- `Power Query: Lint Document` — lint the active file
- `Power Query: Lint Workspace` — lint all Power Query files in the workspace

### Copilot Agents

This extension contributes two GitHub Copilot agents:

| Agent | Description |
|-------|-------------|
| **PQL - Linter** | Lints and fixes Power Query M code and TMDL code using the PQ Lint rule engine |
| **PQL - Tester** | Creates and manages DAX Query View tests using the PQL.Assert assertion library |

### MCP Configuration

MCP tools are defined remotely and configured via the `mcp.json` file in the extension root. No local MCP server setup is required.

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `powerQueryLint.enable` | boolean | `true` | Enable/disable Power Query linting |

---

## Contributing

For information about development, building, testing, and publishing this extension, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

## Links

- [Support](mailto:support@pqlint.com) — For questions or issues, email support@pqlint.com
- [Terms of Service](http://www.pqlint.com/terms-of-service) — Terms and conditions for using this extension
- [Privacy Policy](http://www.pqlint.com/privacy-policy) — How we handle your data and privacy
