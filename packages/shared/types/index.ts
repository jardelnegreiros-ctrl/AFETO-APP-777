export interface ReminderCreateInput {
  title: string;
  description?: string;
  scheduledAt: Date;
  timezone?: string;
  category?: string;
  repeats?: string;
  repeatInterval?: number;
  notifyBeforeMinutes?: number[];
}

export interface ReminderUpdateInput {
  title?: string;
  description?: string;
  scheduledAt?: Date;
  timezone?: string;
  category?: string;
  isActive?: boolean;
  repeats?: string;
  repeatInterval?: number;
  notifyBeforeMinutes?: number[];
}

export interface ReminderResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  timezone: string;
  category: string | null;
  isActive: boolean;
  isCompleted: boolean;
  repeats: string | null;
  repeatInterval: number | null;
  notifyBeforeMinutes: number[];
  whatsappNotified: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
}

export interface WhatsAppCreateInput {
  title: string;
  description: string;
  dateTime: string;
  category: string;
}

export interface WhatsAppCommand {
  action: string;
  args: Record<string, string>;
  raw: string;
}