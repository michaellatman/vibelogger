#!/usr/bin/env node
import { SERVER_URL, PATHS } from '@vibelogger/shared';

// Simple stdio wrapper for MCP
process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    
    let response: any;
    
    if (request.method === 'resources/list') {
      const res = await fetch(`${SERVER_URL}${PATHS.MCP_RESOURCES_LIST}`, {
        method: 'POST',
      });
      response = await res.json();
    } else if (request.method === 'tools/get_log') {
      const res = await fetch(`${SERVER_URL}${PATHS.MCP_TOOLS_GET_LOG}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.params),
      });
      response = await res.json();
    } else {
      response = { error: 'Unknown method' };
    }
    
    process.stdout.write(JSON.stringify({
      id: request.id,
      result: response,
    }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({
      error: String(err),
    }) + '\n');
  }
});

// Keep process alive
process.stdin.resume();