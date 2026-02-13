# VS Code Extension Quick Start

## Welcome to Power Query Lint Extension Development!

This extension provides Power Query linting capabilities with Model Context Protocol (MCP) server support.

## What's in the folder

* `src/extension.ts` - Main extension activation logic
* `src/mcp-server.ts` - MCP server for AI agent integration
* `package.json` - Extension manifest with commands and settings
* `tsconfig.json` - TypeScript compiler configuration
* `mcp.json` - MCP server configuration
* `.vscode/launch.json` - Debug configuration
* `.vscode/tasks.json` - Build tasks

## Get up and running straight away

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the extension:
   ```bash
   npm run compile
   ```

3. Press `F5` to open a new window with your extension loaded

4. Open a Power Query file (`.pq` or `.pqm`) or create a new one

5. Run commands from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):
   - `Power Query: Lint Document`
   - `Power Query: Lint Workspace`

## Make changes

* You can relaunch the extension from the debug toolbar after making changes
* You can also reload (`Ctrl+R` or `Cmd+R`) the VS Code window with your extension to load changes
* Run `npm run watch` to compile automatically on file changes

## Explore the API

* Open `src/extension.ts` to see the extension's activation logic
* The extension activation code is in the `activate` function
* Commands are registered in the `activate` function

## Run tests

* Open the debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D`) and select `Extension Tests`
* Press `F5` to run the tests in a new window with your extension loaded

## Testing the MCP Server

The MCP server can be tested independently:

1. Compile the extension:
   ```bash
   npm run compile
   ```

2. Run the MCP server directly:
   ```bash
   node dist/mcp-server.js
   ```

3. The server will start and wait for MCP protocol messages on stdin/stdout

## Go further

* **Reduce extension size**: Install only production dependencies with `npm install --production`
* **Bundle with webpack**: Use webpack to bundle your extension for faster loading
* **Publish**: Use `vsce publish` to publish to the VS Code Marketplace
* **CI/CD**: Set up GitHub Actions for automated testing and publishing

## Learn more

* [VS Code Extension API](https://code.visualstudio.com/api)
* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
* [Model Context Protocol](https://modelcontextprotocol.io/)
* [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
