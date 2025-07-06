export const SERVER_PORT = 51234;
export const SERVER_HOST = '127.0.0.1';
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

export const LOG_RETENTION_DAYS = 4;
export const BATCH_INTERVAL_MS = 500;
export const RESPONSE_TIMEOUT_MS = 50;

export const DEFAULT_MIME_TYPE = 'text/plain';

export const PATHS = {
  INGEST: '/ingest',
  MCP_RESOURCES_LIST: '/mcp/resources/list',
  MCP_TOOLS_GET_LOG: '/mcp/tools/get_log',
  MCP_MANIFEST: '/mcp/manifest.json',
} as const;


export const MCP_TOOL_NAME = 'get_log';
export const MCP_SERVER_NAME = 'vibelogger';
export const MCP_SERVER_VERSION = '1.0.0';
export const MCP_SERVER_DESCRIPTION = 'Local logging server with MCP protocol support';