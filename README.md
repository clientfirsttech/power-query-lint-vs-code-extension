# Power Query Lint VS Code Extension

Visual Studio Code Extension for Power Query linting and analysis with Model Context Protocol (MCP) support.

## Features

- 🔍 Lint Power Query files (.pq, .pqm)
- 🤖 MCP integration for AI agent support
- ⚡ Real-time syntax validation
- 📝 Language support for Power Query

## Installation

### Prerequisites

- Visual Studio Code 1.85.0 or higher
- Node.js 18.x or higher

### From Source

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

### From VS Code Marketplace

*(Coming soon once published)*

```bash
code --install-extension clientfirsttech.power-query-lint
```

## Usage

### Linting Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

- `Power Query: Lint Document` — lint the active file
- `Power Query: Lint Workspace` — lint all Power Query files in the workspace

### MCP Configuration

MCP tools are defined remotely and configured via the `mcp.json` file in the extension root. No local MCP server setup is required.

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `powerQueryLint.enable` | boolean | `true` | Enable/disable Power Query linting |

## Development

### Project Structure

```
power-query-lint-vs-code-extension/
├── src/
│   └── extension.ts       # Main extension entry point
├── examples/
│   └── sample.pq          # Sample Power Query file
├── .vscode/
│   ├── launch.json        # VS Code debug configuration
│   └── tasks.json         # Build tasks
├── mcp.json               # MCP configuration (remote tools)
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Building

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

## License

MIT

## Links

- [Repository](https://github.com/clientfirsttech/power-query-lint-vs-code-extension)
- [Issues](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
