import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import Queue from 'bullmq';
import { createReminderFromWhatsApp } from './command-parser';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
};

const checkQueue = new Queue.Queue('reminder-check', { connection: redisConfig });
const notifyQueue = new Queue.Queue('reminder-notify', { connection: redisConfig });
const reminderQueue = new Queue.Queue('reminder-created', { connection: redisConfig });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/reminders', async (req, res) => {
  try {
    const { userId, title, scheduledAt, ...rest } = req.body;
    const reminder = await prisma.reminder.create({
      data: { userId, title, scheduledAt: new Date(scheduledAt), ...rest },
    });
    await reminderQueue.add('create', { reminderId: reminder.id });
    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/reminders/:id', async (req, res) => {
  try {
    const reminder = await prisma.reminder.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!reminder) return res.status(404).json({ error: 'Not found' });
    res.json(reminder);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

createBullBoard({
  queues: [
    new BullMQAdapter(checkQueue),
    new BullMQAdapter(notifyQueue),
    new BullMQAdapter(reminderQueue),
  ],
  serverAdapter: new BullMQAdapter({ createExpressHandler: true }),
});

serverAdapter.setBasePath('/api/queues');
app.use('/api/queues', serverAdapter);

checkQueue.process(async (job) => {
  const { reminderId } = job.data;
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { user: true },
  });
  if (!reminder || !reminder.isActive || reminder.isCompleted || reminder.whatsappNotified) return;
  if (!reminder.user.whatsappProfile?.isLinked) return;
  await notifyQueue.add('notify', { reminderId });
});

notifyQueue.process(async (job) => {
  const { reminderId } = job.data;
  console.log(`Processing notification for reminder ${reminderId}`);
});

const PORT = process.env.PORT || 3001;
createServer(app).listen(PORT, () => {
  console.log(`Worker API running on port ${PORT}`);
});