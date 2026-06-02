import { DriverEarningsAPI } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EarningsSummary {
  todayAmount:    number;
  todayRides:     number;
  weekAmount:     number;
  weekRides:      number;
  monthAmount:    number;
  monthRides:     number;
  walletBalance:  number;
  totalWithdrawn: number;
}

export interface WithdrawalRequest {
  amount:        number;
  bankName:      string;
  accountNumber: string;
  accountHolder: string;
}

// ── All earnings operations via backend API ───────────────────────────────────

export async function fetchEarnings(_userId: string): Promise<{
  rides: any[];
  summary: EarningsSummary;
}> {
  return DriverEarningsAPI.get();
}

export async function fetchTodayEarnings(_userId: string): Promise<{
  amount: number;
  rides: number;
}> {
  return DriverEarningsAPI.getToday();
}

export async function submitWithdrawal(
  _userId: string, _walletBalance: number, req: WithdrawalRequest
): Promise<void> {
  await DriverEarningsAPI.withdraw(req);
}
