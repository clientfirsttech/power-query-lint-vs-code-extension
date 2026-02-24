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

## Development & Support

### Prerequisites

- Node.js 18.x or higher
- Visual Studio Code 1.99.0 or higher

### Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/clientfirsttech/power-query-lint-vs-code-extension.git
   cd power-query-lint-vs-code-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Press `F5` in VS Code to launch the extension in a new Extension Development Host window.

### From VSIX Package

1. Build the extension package:
   ```bash
   npm run package
   ```

2. Install the generated `.vsix` file:
   - Open VS Code
   - Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Click the `...` menu → "Install from VSIX..."
   - Select the generated `power-query-lint-*.vsix` file

### Project Structure

```
power-query-lint-vs-code-extension/
├── src/
│   └── extension.ts       # Main extension entry point
├── resources/
│   └── agents/            # Copilot agent definitions
├── skills/                # Copilot agent skills
├── examples/
│   └── sample.pq          # Sample Power Query file
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Build Commands

```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch mode for development
npm run lint       # Run ESLint
npm run package    # Create VSIX package
```

### Testing

1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open a Power Query file (`.pq` or `.pqm`)
4. Run linting commands from the Command Palette

### Making Changes

- Relaunch the extension from the debug toolbar after making changes
- Or reload (`Ctrl+R` / `Cmd+R`) the VS Code window to pick up changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with [standard-version](https://github.com/conventional-changelog/standard-version) for automated semantic versioning.

Use these commit prefixes:

| Prefix | Version Bump | Example |
|--------|-------------|---------|
| `fix:` | Patch (0.0.x) | `fix: resolve lint crash on empty files` |
| `feat:` | Minor (0.x.0) | `feat: add new lint rule for table references` |
| `feat!:` or `BREAKING CHANGE:` | Major (x.0.0) | `feat!: redesign configuration schema` |
| `chore:` | No bump | `chore: update dependencies` |
| `docs:` | No bump | `docs: update README` |
| `refactor:` | No bump | `refactor: simplify linting pipeline` |

### Releasing

```bash
npm run release        # auto-detect bump from commit history
npm run release:patch  # force patch bump (0.0.x)
npm run release:minor  # force minor bump (0.x.0)
npm run release:major  # force major bump (x.0.0)
```

Then push with tags:

```bash
git push --follow-tags origin main
```

## Publishing to VS Code Marketplace

### One-Time Setup

1. **Create a Publisher** at [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
   - Sign in with your Microsoft account
   - The publisher ID for this extension is `ClientFirstTechnologies`

2. **Install VSCE** (if not already installed):
   ```bash
   npm install -g @vscode/vsce
   ```

3. **Create a Personal Access Token (PAT)**:
   - Go to [Azure DevOps](https://dev.azure.com)
   - Navigate to **User Settings > Personal Access Tokens**
   - Create a new token with **Marketplace (Manage)** scope
   - Copy the token (you won't see it again)

4. **Login with VSCE**:
   ```bash
   vsce login ClientFirstTechnologies
   ```
   Paste your PAT when prompted.

### Publishing

**Package locally** (optional, for testing):
```bash
vsce package
```

This creates a `.vsix` file you can install locally:
```bash
code --install-extension power-query-lint-0.2.1.vsix
```

**Publish to Marketplace**:
```bash
vsce publish
```

Or publish with an automatic version bump:
```bash
vsce publish patch   # 0.2.1 → 0.2.2
vsce publish minor   # 0.2.1 → 0.3.0
vsce publish major   # 0.2.1 → 1.0.0
```

### Important Notes

- The `publisher` field in `package.json` must match your Marketplace publisher ID (`ClientFirstTechnologies`)
- The `version` must increase on every publish
- Do not set `"private": true` in `package.json`
- The extension will appear at: https://marketplace.visualstudio.com/items?itemName=ClientFirstTechnologies.power-query-lint
- It may take 2–10 minutes to show up after publishing

### Required Files

Ensure these files exist before publishing:

| File | Purpose |
|------|---------|
| `README.md` | Marketplace listing page content |
| `CHANGELOG.md` | Version history |
| `LICENSE` | License file |
| `images/icon.jpg` | Extension icon (128x128 recommended) |

## License

MIT

## Links

- [Repository](https://github.com/clientfirsttech/power-query-lint-vs-code-extension)
- [Issues](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
