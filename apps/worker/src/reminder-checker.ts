import Queue from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERSION } from '@lembre-me/shared/constants';

const prisma = new PrismaClient();

const queue = new Queue.Queue('reminder-check', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

queue.process(async (job) => {
  const { reminderId } = job.data;

  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { user: true },
  });

  if (!reminder || !reminder.isActive || reminder.isCompleted || reminder.whatsappNotified) {
    return;
  }

  if (!reminder.user.whatsappProfile?.isLinked) {
    return;
  }

  const message = `🔔 *${reminder.title}*${reminder.description ? ` — ${reminder.description}` : ''}`;

  await sendWhatsAppMessage(
    reminder.user.whatsappProfile.phoneNumber,
    message
  );

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { whatsappNotified: true },
  });

  await prisma.whatsappMessage.create({
    data: {
      userId: reminder.userId,
      direction: 'outbound',
      content: message,
      relatedReminderId: reminderId,
      status: 'sent',
    },
  });
});

async function sendWhatsAppMessage(to: string, message: string) {
  const url = `https://graph.facebook.com/${WHATSAPP_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body: Record<string, any> = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(errorData)}`);
  }

  return res.json();
}

export default queue;