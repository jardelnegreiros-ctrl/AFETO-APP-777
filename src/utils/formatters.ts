/**
 * Utility functions for consistent Brazilian Portuguese currency and date formatting.
 */

/**
 * Formats a numeric value into BRL currency string (e.g. R$ 1.234,56)
 */
export function formatCurrency(amount: number | null | undefined): string {
  const numericVal = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericVal);
}

/**
 * Formats an ISO date string (YYYY-MM-DD or full ISO string) into DD/MM/AAAA format.
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    // If string is YYYY-MM-DD
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year.length === 4 && month.length === 2 && day.length === 2) {
        return `${day}/${month}/${year}`;
      }
    }
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Formats ISO string into DD/MM/AAAA HH:mm format.
 */
export function formatDateTime(dateTimeString?: string | null): string {
  if (!dateTimeString) return '-';
  try {
    const dateObj = new Date(dateTimeString);
    if (isNaN(dateObj.getTime())) return formatDate(dateTimeString);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return dateTimeString;
  }
}
