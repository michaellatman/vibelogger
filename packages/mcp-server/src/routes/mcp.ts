import { FastifyInstance } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { 
  PATHS, 
  ResourcesListResponse, 
  GetLogOptions, 
  GetLogResponse,
  stripAnsi,
  decodeBase64,
  parseNDJSON,
  LogRecord
} from '@vibelogger/shared';
import { logIndex, getLogDir } from '../storage.js';

export function setupMCPRoutes(fastify: FastifyInstance): void {
  // Main MCP endpoint that handles JSON-RPC requests
  fastify.post('/mcp', async (request, reply) => {
    const jsonRpcRequest = request.body as any;
    
    try {
      let result: any;
      
      switch (jsonRpcRequest.method) {
        case 'initialize':
          result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              resources: { 
                list: true, 
                read: true,
                subscribe: false,
                listChanged: true
              },
              tools: { list: true },
            },
            serverInfo: {
              name: 'vibelogger',
              version: '1.0.0',
            },
          };
          break;
          
        case 'resources/list':
          const now = Date.now();
          const resources = Array.from(logIndex.values()).map(resource => ({
            ...resource,
            props: {
              ...resource.props,
              secs_since_activity: Math.floor((now - new Date(resource.props.last_ts).getTime()) / 1000),
            },
          }));
          result = { resources };
          break;
          
        case 'tools/list':
          result = {
            tools: [{
              name: 'get_log',
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
            }],
          };
          break;
          
        case 'tools/call':
          const { name, arguments: args } = jsonRpcRequest.params;
          if (name === 'get_log') {
            const { id, fmt = 'text', tail, head, since } = args;
            const resource = logIndex.get(id);
            if (!resource) {
              throw new Error('Log not found');
            }
            const content = await readLogSlice(id, { tail, head, since });
            const formattedContent = fmt === 'json' ? content : stripAnsi(content);
            result = { 
              content: [
                {
                  type: 'text',
                  text: formattedContent
                }
              ]
            };
          } else {
            throw new Error(`Unknown tool: ${name}`);
          }
          break;
          
        default:
          throw new Error(`Unknown method: ${jsonRpcRequest.method}`);
      }
      
      reply.send({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id,
        result,
      });
    } catch (err: any) {
      reply.send({
        jsonrpc: '2.0',
        id: jsonRpcRequest.id,
        error: {
          code: -32603,
          message: err.message || 'Internal error',
        },
      });
    }
  });
  
  // Legacy endpoints for backward compatibility
  fastify.post(PATHS.MCP_RESOURCES_LIST, async (request, reply) => {
    const now = Date.now();
    const resources = Array.from(logIndex.values()).map(resource => ({
      ...resource,
      props: {
        ...resource.props,
        secs_since_activity: Math.floor((now - new Date(resource.props.last_ts).getTime()) / 1000),
      },
    }));

    const response: ResourcesListResponse = { resources };
    reply.send(response);
  });

  fastify.post(PATHS.MCP_TOOLS_GET_LOG, async (request, reply) => {
    const options = request.body as GetLogOptions;
    const { id, fmt = 'text', tail, head, since } = options;

    const resource = logIndex.get(id);
    if (!resource) {
      reply.code(404).send({ error: 'Log not found' });
      return;
    }

    try {
      const content = await readLogSlice(id, { tail, head, since });
      const formattedContent = fmt === 'json' ? content : stripAnsi(content);
      
      const response: GetLogResponse = { content: formattedContent };
      reply.send(response);
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Error reading log' });
    }
  });
}

async function readLogSlice(
  id: string, 
  options: { tail?: number; head?: number; since?: string }
): Promise<string> {
  const dir = await getLogDir();
  const filePath = path.join(dir, `${id}.ndjson`);

  const lines: string[] = [];
  const sinceMs = options.since ? new Date(options.since).getTime() : undefined;

  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    const rl = createInterface({ input: stream });

    rl.on('line', (line) => {
      if (!line.trim()) return;

      const record = parseNDJSON<LogRecord>(line);
      if (!record) return;

      // Filter by timestamp if needed
      if (sinceMs && record.ts < sinceMs) return;

      // Decode and format the output
      let output = '';
      if (record.data) {
        output = decodeBase64(record.data);
      } else if (record.event === 'exit') {
        output = `\n[Process exited with code ${record.code}]\n`;
      } else if (record.message) {
        output = `[${record.level || 'log'}] ${record.message}\n`;
      }

      if (output) {
        lines.push(output);
      }
    });

    rl.on('close', () => {
      let result = lines;

      // Apply head/tail filters
      if (options.tail) {
        result = result.slice(-options.tail);
      } else if (options.head) {
        result = result.slice(0, options.head);
      }

      resolve(result.join(''));
    });

    rl.on('error', reject);
  });
}