import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const payloadSchema = z.object({
  phoneNumber: z.string(),
  content: z.string(),
  waMessageId: z.string().optional(),
  timestamp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, content, waMessageId, timestamp } = payloadSchema.parse(body);

    const profile = await prisma.whatsappProfile.findUnique({
      where: { phoneNumber },
    });

    const commandMatch = content.match(/^\/(\w+)(?:\s+(.*))?$/);
    let parsedCommand = null;

    if (commandMatch) {
      parsedCommand = commandMatch[1];
      if (['lembrete', 'criar', 'nova'].includes(commandMatch[1])) {
        parsedCommand = 'create_reminder';
      }
    }

    let relatedReminderId = null;

    if (['concluir', 'cancelar', 'excluir', 'completar'].includes(parsedCommand || '')) {
      const idMatch = content.match(/\b([a-f0-9-]{36})\b/);
      if (idMatch) {
        const reminder = await prisma.reminder.findFirst({
          where: { id: idMatch[1], userId: profile?.userId || '' },
        });
        if (reminder) relatedReminderId = reminder.id;
      }
    }

    await prisma.whatsappMessage.create({
      data: {
        phoneNumber,
        direction: 'inbound',
        content,
        waMessageId: waMessageId || null,
        status: 'received',
        parsedCommand,
        relatedReminderId,
        timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
      },
    });

    if (parsedCommand === 'create_reminder') {
      const { createReminderFromWhatsApp } = require('@lembre-me/worker/src/command-parser');
      await createReminderFromWhatsApp(phoneNumber, content);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}