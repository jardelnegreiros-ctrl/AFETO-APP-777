import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  repeats: z.string().optional(),
  repeatInterval: z.number().optional(),
  notifyBeforeMinutes: z.array(z.number()).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const reminder = await prisma.reminder.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 });
    }

    const updated = await prisma.reminder.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.category && { category: data.category }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.repeats !== undefined && { repeats: data.repeats }),
        ...(data.repeatInterval !== undefined && { repeatInterval: data.repeatInterval }),
        ...(data.notifyBeforeMinutes !== undefined && { notifyBeforeMinutes: data.notifyBeforeMinutes }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(serializeReminder(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const reminder = await prisma.reminder.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 });
    }

    await prisma.reminder.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function serializeReminder(r: any) {
  return {
    id: r.id,
    userId: r.userId,
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
  };
}