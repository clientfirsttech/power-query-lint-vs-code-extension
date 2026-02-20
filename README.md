# Power Query Lint VS Code Extension

Visual Studio Code Extension for Power Query linting and analysis with Model Context Protocol (MCP) support.

## Features

- 🔍 Lint Power Query files (.pq, .pqm)
- 🤖 MCP server integration for AI agent support
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

4. Press F5 in VS Code to launch the extension in a new Extension Development Host window.

### From VSIX Package

1. Build the extension package:
   ```bash
   npm run package
   ```

2. Install the generated `.vsix` file:
   - Open VS Code
   - Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
   - Click the `...` menu → "Install from VSIX..."
   - Select the generated `power-query-lint-*.vsix` file

### From VS Code Marketplace

*(Coming soon once published)*

```bash
code --install-extension clientfirsttech.power-query-lint
```

## Usage

### Linting Commands

- **Lint Document**: Use Command Palette (Ctrl+Shift+P / Cmd+Shift+P) → `Power Query: Lint Document`
- **Lint Workspace**: Use Command Palette → `Power Query: Lint Workspace`

### MCP Server Configuration

The extension includes an MCP server that allows AI agents to interact with Power Query linting functionality.

#### Configuration File

The `mcp.json` file in the extension root configures the MCP server:

```json
{
  "mcpServers": {
    "power-query-lint": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/mcp-server.js"],
      "description": "MCP server for Power Query linting and analysis"
    }
  }
}
```

#### Available MCP Tools

1. **lint_powerquery**: Lint and analyze Power Query code
   - Input: `code` (string, required), `filePath` (string, optional), `analyze` (boolean, optional)
   - Returns: Linting results with issues found; when `analyze` is `true`, also includes pattern insights

#### Setting up MCP for AI Agents

To use the MCP server with Claude Desktop or other MCP-compatible clients:

1. Locate your MCP client configuration file:
   - **Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the Power Query Lint MCP server configuration:
   ```json
   {
     "mcpServers": {
       "power-query-lint": {
         "command": "node",
         "args": ["/path/to/extension/dist/mcp-server.js"]
       }
     }
   }
   ```

3. Restart your MCP client

## Extension Settings

This extension contributes the following settings:

- `powerQueryLint.enable`: Enable/disable Power Query linting (default: `true`)
- `powerQueryLint.mcpServer.enabled`: Enable MCP server for AI agent integration (default: `true`)

## Development

### Project Structure

```
power-query-lint-vs-code-extension/
├── src/
│   ├── extension.ts       # Main extension entry point
│   └── mcp-server.ts      # MCP server implementation
├── .vscode/
│   ├── launch.json        # VS Code debug configuration
│   └── tasks.json         # Build tasks
├── mcp.json               # MCP server configuration
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

To test the extension:

1. Open the project in VS Code
2. Press F5 to launch the Extension Development Host
3. Open a Power Query file (.pq or .pqm)
4. Run linting commands from the Command Palette

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [Repository](https://github.com/clientfirsttech/power-query-lint-vs-code-extension)
- [Issues](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)
