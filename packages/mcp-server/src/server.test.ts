import { describe, it, expect } from 'vitest';
import { SERVER_PORT, SERVER_HOST } from '@vibelogger/shared';

describe('MCP Server', () => {
  it('should have correct configuration', () => {
    expect(SERVER_PORT).toBe(51234);
    expect(SERVER_HOST).toBe('127.0.0.1');
  });
});