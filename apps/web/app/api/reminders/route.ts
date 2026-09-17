import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  scheduledAt: z.string().datetime(),
  timezone: z.string().optional(),
  category: z.string().optional(),
  repeats: z.string().optional(),
  repeatInterval: z.number().optional(),
  notifyBeforeMinutes: z.array(z.number()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const data = createReminderSchema.parse(body);

    const reminder = await prisma.reminder.create({
      data: {
        userId: session.user.id,
        title: data.title,
        description: data.description,
        scheduledAt: new Date(data.scheduledAt),
        timezone: data.timezone || 'America/Sao_Paulo',
        category: data.category,
        isActive: true,
        repeats: data.repeats,
        repeatInterval: data.repeatInterval,
        notifyBeforeMinutes: data.notifyBeforeMinutes || [],
      },
    });

    return NextResponse.json(
      {
        id: reminder.id,
        userId: reminder.userId,
        title: reminder.title,
        description: reminder.description,
        scheduledAt: reminder.scheduledAt.toISOString(),
        timezone: reminder.timezone,
        category: reminder.category,
        isActive: reminder.isActive,
        isCompleted: reminder.isCompleted,
        repeats: reminder.repeats,
        repeatInterval: reminder.repeatInterval,
        notifyBeforeMinutes: reminder.notifyBeforeMinutes,
        whatsappNotified: reminder.whatsappNotified,
        createdAt: reminder.createdAt.toISOString(),
        updatedAt: reminder.updatedAt.toISOString(),
        completedAt: reminder.completedAt?.toISOString() || null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const date = searchParams.get('date');

    const where: Record<string, any> = { userId: session.user.id };

    if (status === 'completed') where.isCompleted = true;
    else if (status === 'pending') { where.isCompleted = false; where.isActive = true; }

    if (category) where.category = category;

    if (date) {
      const startOfDay = new Date(date + 'T00:00:00');
      const endOfDay = new Date(date + 'T23:59:59');
      where.scheduledAt = { gte: startOfDay, lte: endOfDay };
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({
      reminders: reminders.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        scheduledAt: r.scheduledAt.toISOString(),
        timezone: r.timezone,
        category: r.category,
        isActive: r.isActive,
        isCompleted: r.isCompleted,
        repeats: r.repeats,
        repeatInterval: r.repeatInterval,
        notifyBeforeMinutes: r.notifyBeforeMinutes,
        whatsappNotified: r.whatsappNotified,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}