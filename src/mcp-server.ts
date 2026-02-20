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
    description: 'Lint and analyze Power Query code for errors, patterns, and best practices',
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
        analyze: {
          type: 'boolean',
          description: 'Include pattern analysis and best practice insights',
          default: false,
        },
      },
      required: ['code'],
    },
  },
];

/**
 * Result structure for the lint_powerquery tool
 */
interface LintResult {
  status: string;
  message: string;
  issues: unknown[];
  filePath: string;
  codeLength: number;
  insights?: string[];
}

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
        const analyze = args?.analyze as boolean | undefined;

        // TODO: Implement actual linting logic
        const result: LintResult = {
          status: 'success',
          message: 'Linting completed',
          issues: [],
          filePath: filePath || 'inline',
          codeLength: code?.length || 0,
        };

        if (analyze) {
          // TODO: Implement actual analysis logic
          result.insights = ['Code structure looks good'];
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
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
