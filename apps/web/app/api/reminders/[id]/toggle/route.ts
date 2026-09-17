import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      data: { isActive: !reminder.isActive, updatedAt: new Date() },
    });

    return NextResponse.json({ id: updated.id, isActive: updated.isActive });
  } catch (error) {
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