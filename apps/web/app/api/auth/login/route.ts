import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { JWT_SECRET, JWT_ACCESS_EXPIRY } from '@lembre-me/shared/constants';
import { z } from 'zod';

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'E-mail ou senha inválidos' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'E-mail ou senha inválidos' },
        { status: 401 }
      );
    }

    const token = sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY }
    );

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}