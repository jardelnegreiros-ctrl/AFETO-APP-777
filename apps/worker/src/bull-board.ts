import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { BullMQProvider } from '@bull-board/api/bullMQProvider.js';
import Queue from 'bullmq';

const queues: Record<string, Queue.Queue> = {};

export function getQueue(name: string): Queue.Queue {
  if (!queues[name]) {
    queues[name] = new Queue.Queue(name, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      },
    });
  }
  return queues[name];
}

export function setupBullBoard() {
  const serverAdapter = new BullMQAdapter({
    createExpressHandler: true,
  });

  createBullBoard({
    queues: [],
    serverAdapter,
  });

  serverAdapter.setBasePath('/api/queues');
  return serverAdapter;
}