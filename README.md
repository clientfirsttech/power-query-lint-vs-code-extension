# Power Query Lint VS Code Extension

Visual Studio Code Extension for Power Query linting and analysis with Model Context Protocol (MCP) support and a built-in **`pql-test` CLI** for running PQL.Assert tests against PBIP models.

## Features

- 🔍 Lint Power Query files (.pq, .pqm)
- 🤖 MCP server integration for AI agent support
- ⚡ Real-time syntax validation
- 📝 Language support for Power Query
- 🧪 **`pql-test` CLI** — discover and execute `PQL.Assert` tests from PBIP models

---

## Installation

### Prerequisites

- Visual Studio Code 1.85.0 or higher
- Node.js 18.x or higher

> **Tip:** After running `npm install` the prerequisite check runs automatically.  
> You can re-run it at any time with `npm run check-prereqs`.

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/clientfirsttech/power-query-lint-vs-code-extension.git
   cd power-query-lint-vs-code-extension
   ```

2. Install dependencies (prerequisites are verified automatically):
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

---

## pql-test CLI

The `pql-test` command-line tool is bundled with this extension. It wraps the
`PQL.Assert` **RetrieveTests** and **RetrieveTestByName** functions to discover
Power Query tests stored in a PBIP (Power BI Project) model, and can execute
those tests with a single command.

### CLI Quick Start

```bash
# After npm install, the CLI is available as:
node dist/cli.js <command> [options]

# Or, if installed globally via npm link / npm install -g:
pql-test <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `retrieve-tests <modelPath>` | List all `PQL.Assert` tests discovered in the PBIP model |
| `retrieve-test <modelPath> <name>` | Show a single test by name (encapsulates `RetrieveTestByName`) |
| `run-tests <modelPath>` | Run all tests in the model |
| `check-prereqs` | Verify Node.js and npm prerequisites |

### Options

| Flag | Description |
|------|-------------|
| `--test <name>` | Combine with `retrieve-tests` or `run-tests` to target a single test |
| `--verbose`, `-v` | Show extra details (file paths, assertion descriptions, durations) |
| `--help`, `-h` | Display usage information |
| `--version`, `-V` | Display the CLI version |

### Examples

```bash
# List all tests in the sample model
node dist/cli.js retrieve-tests examples/samplemodel

# List a specific test (encapsulates PQL.Assert RetrieveTestByName)
node dist/cli.js retrieve-test examples/samplemodel "Sales Total Should Be Positive"

# Retrieve a specific test via --test flag
node dist/cli.js retrieve-tests examples/samplemodel --test "Sales Total Should Be Positive"

# Run all tests
node dist/cli.js run-tests examples/samplemodel

# Run a specific test
node dist/cli.js run-tests examples/samplemodel --test "Sales Total Should Be Positive"

# Run tests with verbose output (shows assertion descriptions and durations)
node dist/cli.js run-tests examples/samplemodel --verbose

# Verify prerequisites
node dist/cli.js check-prereqs
```

### PBIP Model Structure

The CLI expects a **Power BI Project (PBIP)** folder layout.  Test files are
`.pq` or `.pqm` files that contain at least one `PQL.Assert` call, placed in
a `tests/` sub-folder inside the SemanticModel directory:

```
mymodel/
├── mymodel.pbip
└── mymodel.SemanticModel/
    ├── .platform
    ├── definition.pbism
    └── tests/
        ├── Test_SalesTotal.pq
        ├── Test_DateDimension.pq
        └── Test_ProductCategories.pq
```

A sample model is included at [`examples/samplemodel/`](examples/samplemodel).

### Writing Tests

Each test file should contain a `PQL.Assert` call.  Metadata comments are
optional but recommended:

```powerquery
// TestName: Sales Total Should Be Positive
// TestDescription: Verifies that the total sales amount is greater than zero

let
    SalesTotal = 1250000.00,

    TestResult = PQL.Assert(
        "Sales Total Should Be Positive",
        SalesTotal > 0,
        "Expected sales total to be greater than zero"
    )
in
    TestResult
```

| Comment | Purpose |
|---------|---------|
| `// TestName: …` | Human-readable name shown in CLI output (falls back to filename) |
| `// TestDescription: …` | Optional description shown in `retrieve-tests` output |

---

## Usage (VS Code Extension)

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
      "description": "MCP server for Power Query linting and analysis",
      "env": {
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

#### Available MCP Tools

1. **lint_powerquery**: Lint Power Query code
   - Input: `code` (string), optional `filePath` (string)
   - Returns: Linting results with issues found

2. **analyze_powerquery**: Analyze Power Query code for patterns
   - Input: `code` (string)
   - Returns: Code analysis insights

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

---

## Extension Settings

This extension contributes the following settings:

- `powerQueryLint.enable`: Enable/disable Power Query linting (default: `true`)
- `powerQueryLint.mcpServer.enabled`: Enable MCP server for AI agent integration (default: `true`)

---

## Development

### Project Structure

```
power-query-lint-vs-code-extension/
├── examples/
│   ├── sample.pq                  # Sample Power Query file
│   └── samplemodel/               # Sample PBIP model with tests
│       ├── samplemodel.pbip
│       └── samplemodel.SemanticModel/
│           ├── .platform
│           ├── definition.pbism
│           └── tests/             # PQL.Assert test files
│               ├── Test_SalesTotal.pq
│               ├── Test_DateDimension.pq
│               └── Test_ProductCategories.pq
├── scripts/
│   └── check-prereqs.js           # Prerequisites verification script
├── src/
│   ├── cli.ts                     # pql-test CLI entry point
│   ├── extension.ts               # VS Code extension entry point
│   ├── mcp-server.ts              # MCP server implementation
│   ├── pql-test-runner.ts         # Core RetrieveTests / RunTests library
│   └── test/
│       ├── cli.test.ts            # CLI integration tests
│       └── pql-test-runner.test.ts # Unit tests for the core library
├── .vscode/
│   ├── launch.json                # VS Code debug configuration
│   └── tasks.json                 # Build tasks
├── mcp.json                       # MCP server configuration
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

### Building

```bash
npm run compile        # Compile TypeScript
npm run watch          # Watch mode for development
npm run lint           # Run ESLint
npm run package        # Create VSIX package
npm run check-prereqs  # Verify prerequisites
```

### Testing

```bash
npm test               # Compile and run the full test suite (45 tests)
```

Tests use the built-in `node:test` runner (Node 18+) and cover:

- `retrieveTests` — discovers test files from a PBIP model
- `retrieveTestByName` — finds a specific test by name (case-insensitive)
- `runTest` / `runTests` — executes PQL.Assert assertions
- `runTestsFromModel` — full end-to-end model test run
- CLI commands — `retrieve-tests`, `retrieve-test`, `run-tests`, `check-prereqs`

To test the VS Code extension UI:

1. Open the project in VS Code
2. Press F5 to launch the Extension Development Host
3. Open a Power Query file (.pq or .pqm)
4. Run linting commands from the Command Palette

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [Repository](https://github.com/clientfirsttech/power-query-lint-vs-code-extension)
- [Issues](https://github.com/clientfirsttech/power-query-lint-vs-code-extension/issues)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)
