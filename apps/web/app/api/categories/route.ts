import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextResponse) {
  const categories = ['Trabalho', 'Pessoal', 'Saúde', 'Estudo', 'Família', 'Outros'];
  return NextResponse.json({ categories });
}