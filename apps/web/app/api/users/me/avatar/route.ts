import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: body.avatarUrl || null },
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}