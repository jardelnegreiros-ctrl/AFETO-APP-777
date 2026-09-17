import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';
import { JWT_SECRET, JWT_ACCESS_EXPIRY } from '@lembre-me/shared/constants';
import { z } from 'zod';

const prisma = new PrismaClient();

const tokenSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { refreshToken } = tokenSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const token = sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY }
    );

    return NextResponse.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}