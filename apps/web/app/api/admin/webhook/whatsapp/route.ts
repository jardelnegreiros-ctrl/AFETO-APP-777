import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const webhookSchema = z.object({
  object: z.string().optional(),
  entry: z.array(z.record(z.unknown())).optional(),
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-hub-signature-256');
  const expectedSignature = process.env.WHATSAPP_WEBHOOK_SECRET;

  if (expectedSignature && signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = webhookSchema.parse(body);

    if (data.entry && data.entry.length > 0) {
      const changes = data.entry[0].changes as Array<{
        value: {
          messages?: Array<{
            from?: string;
            text?: { body?: string };
            id?: string;
            timestamp?: string;
          }>;
          contacts?: Array<{
            wa_id?: string;
            profile?: { name?: string };
          }>;
        };
      }>;

      for (const change of changes) {
        const messages = change.value?.messages;
        const contacts = change.value?.contacts;

        if (messages && messages.length > 0) {
          for (const message of messages) {
            const phoneNumber = contacts?.[0]?.wa_id || message.from;
            const content = message.text?.body || '';

            const headers = { 'content-type': 'application/json' };
            await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/reminders/webhook`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                phoneNumber,
                content,
                waMessageId: message.id,
                timestamp: message.timestamp,
              }),
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}