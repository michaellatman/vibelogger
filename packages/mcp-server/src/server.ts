import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SERVER_HOST, SERVER_PORT, PATHS } from '@vibelogger/shared';
import { setupRoutes } from './routes.js';
import { initializeStorage, startPurgeScheduler } from './storage.js';
import { logger } from './logger.js';

const fastify = Fastify({
  logger: logger,
  bodyLimit: 10 * 1024 * 1024, // 10MB
});

// Add content type parser for NDJSON
fastify.addContentTypeParser('application/x-ndjson', { parseAs: 'string' }, (req, body, done) => {
  done(null, body);
});

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    // Initialize storage
    await initializeStorage();

    // Start purge scheduler
    startPurgeScheduler();

    // Setup routes
    setupRoutes(fastify);

    // Start server
    await fastify.listen({ port: SERVER_PORT, host: SERVER_HOST });
    
    console.log(`VibeLogger MCP server listening on ${SERVER_HOST}:${SERVER_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await fastify.close();
  process.exit(0);
});

start();