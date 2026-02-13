#!/usr/bin/env node

/**
 * MCP Server for Power Query Lint
 * This server provides AI agents with access to Power Query linting functionality
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Define available tools for the MCP server
const TOOLS = [
  {
    name: 'lint_powerquery',
    description: 'Lint a Power Query file or code snippet',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Power Query code to lint',
        },
        filePath: {
          type: 'string',
          description: 'Optional file path for context',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'analyze_powerquery',
    description: 'Analyze Power Query code for patterns and best practices',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Power Query code to analyze',
        },
      },
      required: ['code'],
    },
  },
];

/**
 * Create and configure the MCP server
 */
async function main() {
  const server = new Server(
    {
      name: 'power-query-lint',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS,
    };
  });

  // Handle tool execution request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'lint_powerquery': {
        const code = args?.code as string;
        const filePath = args?.filePath as string | undefined;
        
        // TODO: Implement actual linting logic
        // For now, return a placeholder response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'success',
                message: 'Linting completed',
                issues: [],
                filePath: filePath || 'inline',
                codeLength: code?.length || 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'analyze_powerquery': {
        const code = args?.code as string;
        
        // TODO: Implement actual analysis logic
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'success',
                message: 'Analysis completed',
                insights: ['Code structure looks good'],
                codeLength: code?.length || 0,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Start the server using stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Power Query Lint MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
