export const CATEGORIES = ['Trabalho', 'Pessoal', 'Saúde', 'Estudo', 'Família', 'Outros'] as const;
export const NOTIFY_BEFORE_OPTIONS = [5, 15, 30, 60, 120, 240] as const;
export const REMINDER_REPEAT_OPTIONS = [
  { value: '', label: 'Não repetir' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
] as const;
export const COMMAND_PREFIX = '/';
export const WHATSAPP_WEBHOOK_PATH = '/api/admin/webhook/whatsapp';
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';