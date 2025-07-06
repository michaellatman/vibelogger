import { FastifyInstance } from 'fastify';
import { Readable } from 'stream';
import { PATHS, LogRecord, sanitizeName } from '@vibelogger/shared';
import { appendLog, logIndex } from '../storage.js';
import { notificationManager } from '../notifications.js';

export function setupIngestRoute(fastify: FastifyInstance): void {
  fastify.post(`${PATHS.INGEST}/:name`, async (request, reply) => {
    const { name: rawName } = request.params as { name: string };
    const name = sanitizeName(rawName);

    try {
      const body = request.body as string;
      const lines = body.split('\n').filter(line => line.trim());
      let lineCount = 0;

      for (const line of lines) {
        await appendLog(name, line + '\n');
        lineCount++;
      }

      // Update line count in index
      const resource = logIndex.get(name);
      let isNewResource = false;
      
      if (resource) {
        resource.props.line_count += lineCount;
        resource.props.last_ts = new Date().toISOString();
      } else {
        // Create new resource if it doesn't exist
        isNewResource = true;
        logIndex.set(name, {
          id: name,
          uri: `log://${name}`,
          name: name,
          mimeType: 'text/plain',
          props: {
            started: new Date().toISOString(),
            last_ts: new Date().toISOString(),
            line_count: lineCount,
            size_bytes: body.length,
          },
        });
      }

      // Send notifications
      if (isNewResource) {
        notificationManager.notifyResourcesListChanged();
      } else {
        notificationManager.notifyResourceUpdated(`log://${name}`);
      }

      reply.code(204).send();
    } catch (err) {
      fastify.log.error(err);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}