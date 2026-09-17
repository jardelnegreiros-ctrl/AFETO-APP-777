import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const completeSchema = z.object({});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    const updated = await prisma.reminder.update({
      where: { id: params.id },
      data: { isCompleted: true, completedAt: new Date(), updatedAt: new Date() },
    });

    return NextResponse.json({
      id: updated.id,
      isCompleted: updated.isCompleted,
      completedAt: updated.completedAt?.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}