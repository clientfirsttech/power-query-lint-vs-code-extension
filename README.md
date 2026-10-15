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

### Claude Code

The same agents and skills are available in [Claude Code](https://claude.com/claude-code) as the `power-query-lint` plugin. It is opt-in: when this extension detects Claude Code it asks once whether to enable it, and you can choose **Enable**, **Not now**, or **Don't ask again**. Nothing in your Claude Code settings changes unless you choose Enable.

You can also run **Power Query: Enable for Claude Code** or **Power Query: Remove from Claude Code** from the Command Palette at any time, or turn the one-time prompt off with the `powerQueryLint.claudeCode.promptOnStartup` setting. After you enable it, the extension keeps the plugin pointed at the installed extension version when the extension updates. Start a new Claude Code session to pick up changes.

If Claude Code's command line isn't found, the extension shows the two commands to run yourself:

```bash
claude plugin marketplace add "<extension folder>" --scope user
claude plugin install power-query-lint@power-query-lint-extension --scope user
```

To try the plugin from a clone of this repository for a single session instead, run `claude --plugin-dir .` from the repository root.

The plugin provides the `pql-linter` and `pql-tester` agents, the `pql-assert`, `pql-test`, and `semantic-model-authoring` skills, and the `powerbi-modeling-mcp` and `pqlint-mcp` MCP servers. Before linting, set your Power Query Lint subscription key in the environment Claude Code runs in:

```powershell
$env:OCP_APIM_SUBSCRIPTION_KEY = "<your key>"
```

Requires Node.js (for `npx`) and, for test execution, the `pql-test` CLI (see the `pql-test` skill). You can also install the CLI's own skill with `pql-test skill --install claude`.

### Prerequisites (VS Code)

- Visual Studio Code 1.99.0 or higher
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension (required dependency)
- [Power BI Model MCP](https://marketplace.visualstudio.com/items?itemName=analysis-services.powerbi-modeling-mcp) extension — provides MCP tools for connecting to and querying Power BI Desktop, Analysis Services, and Fabric semantic models

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

MCP tools are defined remotely and configured via the `mcp.json` file in the extension root. No local MCP server setup is required. In Claude Code, the plugin ships its own MCP configuration.

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `powerQueryLint.enable` | boolean | `true` | Enable/disable Power Query linting |

---

## Contributing

For information about development, building, testing, and publishing this extension, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Released under the [Business Source License 1.1](LICENSE). Non-production use is permitted, and the Additional Use Grant allows production use to test, validate, or monitor Power BI / Microsoft Fabric semantic models, provided the work is not offered to third parties as a competing hosted, managed, or embedded product or service. The license converts to [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) four years from the date each version is published.

Portions of this extension are derived from third-party works under their own licenses (for example, the `semantic-model-authoring` skill from [microsoft/skills-for-fabric](https://github.com/microsoft/skills-for-fabric), MIT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Links

- [Support](mailto:support@pqlint.com) — For questions or issues, email support@pqlint.com
- [Terms of Service](http://www.pqlint.com/terms-of-service) — Terms and conditions for using this extension
- [Privacy Policy](http://www.pqlint.com/privacy-policy) — How we handle your data and privacy
