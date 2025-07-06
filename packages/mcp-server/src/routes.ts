import { FastifyInstance } from 'fastify';
import { PATHS, MCP_TOOL_NAME, MCP_SERVER_NAME, MCP_SERVER_VERSION, MCP_SERVER_DESCRIPTION, MCPManifest } from '@vibelogger/shared';
import { setupIngestRoute } from './routes/ingest.js';
import { setupMCPRoutes } from './routes/mcp.js';

export function setupRoutes(fastify: FastifyInstance): void {
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', version: MCP_SERVER_VERSION };
  });

  // MCP manifest
  fastify.get(PATHS.MCP_MANIFEST, async () => {
    const manifest: MCPManifest = {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      description: MCP_SERVER_DESCRIPTION,
      tools: [
        {
          name: MCP_TOOL_NAME,
          description: 'Get log content with filtering options',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Log ID' },
              fmt: { type: 'string', enum: ['text', 'json'], default: 'text' },
              tail: { type: 'number', description: 'Get last N lines' },
              head: { type: 'number', description: 'Get first N lines' },
              since: { type: 'string', description: 'ISO timestamp to filter from' },
            },
            required: ['id'],
          },
        },
      ],
    };
    return manifest;
  });

  // Setup route groups
  setupIngestRoute(fastify);
  setupMCPRoutes(fastify);
}