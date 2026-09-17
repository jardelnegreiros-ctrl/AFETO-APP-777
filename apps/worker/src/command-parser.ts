import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createReminderFromWhatsApp(phoneNumber: string, content: string) {
  const profile = await prisma.whatsappProfile.findUnique({
    where: { phoneNumber },
    include: { user: true },
  });

  if (!profile || !profile.isLinked) {
    return { error: 'WhatsApp não vinculado' };
  }

  const parts = content.split('|').map((p) => p.trim());

  const title = parts[0]?.replace(/^\/lembrete\s*/, '') || 'Lembrete';
  const description = parts[1] || '';
  const dateTimeStr = parts[2] || '';
  const category = parts[3] || 'Outros';

  let scheduledAt = new Date();
  if (dateTimeStr) {
    const parsed = new Date(dateTimeStr.replace(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:00'));
    if (!isNaN(parsed.getTime())) scheduledAt = parsed;
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId: profile.userId,
      title,
      description,
      scheduledAt,
      category,
      isActive: true,
      timezone: profile.user.timezone || 'America/Sao_Paulo',
    },
  });

  return { success: true, reminderId: reminder.id };
}