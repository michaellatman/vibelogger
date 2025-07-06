# VibeLogger - Project Standards and Information

## Overview
VibeLogger is a zero-friction logging system that captures terminal output and browser console logs, streaming them to a local MCP server accessible by Claude Code.

## Architecture
- **Monorepo Structure**: pnpm workspace with packages:
  - `@vibelogger/shared`: Common types and models
  - `@vibelogger/mcp-server`: Fastify server with MCP endpoints
  - `@vibelogger/chrome-extension`: Browser console capture
  - `@vibelogger/cli`: CLI wrapper (vibelog command)

## Key Technical Decisions
1. **CLI Name**: `vibelog` (not llm-log)
2. **Server Port**: 51234 (hardcoded)
3. **Log Retention**: 4 days maximum (auto-purged)
4. **Log Format**: NDJSON with base64-encoded data
5. **Storage Path**: `$XDG_STATE_HOME/vibelog/logs` or `~/.local/state/vibelog/logs`

## Commands to Run
- **Build**: `pnpm build`
- **Dev Mode**: `pnpm dev`
- **Type Check**: `pnpm typecheck`
- **Lint**: `pnpm lint` (when configured)
- Remember to run builds from the root

## Chrome Extension Specifics
- Users configure allowed sites via popup menu
- Each site can have a custom tag (e.g., "staging frontend")
- Console methods are patched to capture logs
- Logs are batched and sent every 500ms

## MCP Protocol Implementation
- Resources endpoint: `/mcp/resources/list`
- Tool: `get_log` with options for tail, head, since
- All MCP endpoints expect POST requests
- Response includes metadata like line count, size, last activity

## Important URLs
- MCP Server: `http://localhost:51234`
- Log ingestion: `POST /ingest/{name}`
- MCP registration: `claude mcp add logs http://localhost:51234`

## Development Standards
1. **TypeScript**: Strict mode enabled
2. **Module System**: ES modules with NodeNext resolution
3. **Error Handling**: Buffer offline logs, retry on reconnect
4. **Security**: Server binds to localhost only
5. **Performance**: Resources list must respond < 50ms
6. **Build Tool**: Vite for Chrome extension and development
7. **Testing**: Vitest for unit and integration tests
8. **Linting**: ESLint with modern config (flat config)
9. **Formatting**: Prettier for consistent code style

## Data Flow
1. CLI/Browser → POST /ingest/{name} → Server appends to NDJSON file
2. Claude → POST /mcp/tools/get_log → Server reads slice → Claude

## Testing Approach
- **Framework**: Vitest
- **Test Structure**: Co-located with source files (`*.test.ts`)
- **Coverage**: Aim for 80% code coverage
- **Run Tests**: `pnpm test`