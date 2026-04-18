import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@estimator_monthly_usage';

interface MonthlyUsage {
  month: string;  // 'YYYY-MM'
  estimates: number;
  invoices: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getMonthlyUsage(): Promise<MonthlyUsage> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      const parsed: MonthlyUsage = JSON.parse(json);
      if (parsed.month === getCurrentMonth()) return parsed;
    }
  } catch {}
  return { month: getCurrentMonth(), estimates: 0, invoices: 0 };
}

async function saveMonthlyUsage(usage: MonthlyUsage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export async function incrementEstimateUsage(): Promise<void> {
  const usage = await getMonthlyUsage();
  usage.estimates += 1;
  await saveMonthlyUsage(usage);
}

export async function incrementInvoiceUsage(): Promise<void> {
  const usage = await getMonthlyUsage();
  usage.invoices += 1;
  await saveMonthlyUsage(usage);
}

export function canCreateEstimate(usage: MonthlyUsage, limit: number | null): boolean {
  if (limit === null) return true;
  return usage.estimates < limit;
}

export function canCreateInvoice(usage: MonthlyUsage, limit: number | null): boolean {
  if (limit === null) return true;
  return usage.invoices < limit;
}

export function getRemainingEstimates(usage: MonthlyUsage, limit: number | null): number | null {
  if (limit === null) return null;
  return Math.max(0, limit - usage.estimates);
}

export function getRemainingInvoices(usage: MonthlyUsage, limit: number | null): number | null {
  if (limit === null) return null;
  return Math.max(0, limit - usage.invoices);
}

export function getResetDate(): string {
  const now = new Date();
  const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return reset.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}
