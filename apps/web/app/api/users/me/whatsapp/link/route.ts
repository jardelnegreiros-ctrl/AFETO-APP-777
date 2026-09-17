import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber } = body;

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const profile = await prisma.whatsappProfile.upsert({
      where: { userId: session.user.id },
      update: { phoneNumber, isLinked: false },
      create: {
        userId: session.user.id,
        phoneNumber,
        isLinked: false,
      },
    });

    return NextResponse.json({
      profile: {
        id: profile.id,
        phoneNumber: profile.phoneNumber,
        isLinked: profile.isLinked,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}