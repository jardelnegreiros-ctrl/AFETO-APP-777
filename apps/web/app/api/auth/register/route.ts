import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { JWT_SECRET, JWT_ACCESS_EXPIRY } from '@lembre-me/shared/constants';
import { z } from 'zod';

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'E-mail já cadastrado' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const token = sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY }
    );

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name }, token },
      { status: 201 }
    );
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