import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EarningsSummary {
  todayAmount:  number;
  todayRides:   number;
  weekAmount:   number;
  weekRides:    number;
  monthAmount:  number;
  monthRides:   number;
  walletBalance: number;
  totalWithdrawn: number;
}

export interface WithdrawalRequest {
  amount:         number;
  bankName:       string;
  accountNumber:  string;
  accountHolder:  string;
}

// ── Fetch driver earnings ────────────────────────────────────────────────────

export async function fetchEarnings(userId: string): Promise<{
  rides: any[];
  summary: EarningsSummary;
}> {
  const [ridesRes, dpRes] = await Promise.all([
    supabase
      .from('rides')
      .select('*')
      .eq('driver_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false }),
    supabase
      .from('driver_profiles' as any)
      .select('wallet_balance, total_withdrawn')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const rides = ridesRes.data ?? [];
  const earningsFare = (r: any) => r.final_fare ?? r.estimated_fare ?? 0;

  const todayRides  = rides.filter(r => r.completed_at && isToday(new Date(r.completed_at)));
  const weekRides   = rides.filter(r => r.completed_at && isThisWeek(new Date(r.completed_at)));
  const monthRides  = rides.filter(r => r.completed_at && isThisMonth(new Date(r.completed_at)));

  return {
    rides,
    summary: {
      todayAmount:    todayRides.reduce((s, r) => s + earningsFare(r), 0),
      todayRides:     todayRides.length,
      weekAmount:     weekRides.reduce((s, r)  => s + earningsFare(r), 0),
      weekRides:      weekRides.length,
      monthAmount:    monthRides.reduce((s, r) => s + earningsFare(r), 0),
      monthRides:     monthRides.length,
      walletBalance:  (dpRes.data as any)?.wallet_balance  ?? 0,
      totalWithdrawn: (dpRes.data as any)?.total_withdrawn ?? 0,
    },
  };
}

// ── Fetch today's earnings (lightweight, used in driver requests tab) ─────────

export async function fetchTodayEarnings(userId: string): Promise<{
  amount: number;
  rides: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('rides' as any)
    .select('driver_earnings')
    .eq('driver_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', today.toISOString());

  const amount = (data ?? []).reduce(
    (sum: number, r: any) => sum + (r.driver_earnings ?? 0),
    0
  );
  return { amount, rides: (data ?? []).length };
}

// ── Submit withdrawal request ────────────────────────────────────────────────

export async function submitWithdrawal(
  userId: string,
  walletBalance: number,
  req: WithdrawalRequest
): Promise<void> {
  const { amount, bankName, accountNumber, accountHolder } = req;

  if (!Number.isFinite(amount) || amount <= 0 || amount > walletBalance) {
    throw new Error('Invalid withdrawal amount');
  }

  await supabase.from('withdrawals').insert({
    driver_id:      userId,
    amount,
    bank_name:      bankName,
    account_number: accountNumber,
    account_holder: accountHolder,
  });

  const newBalance   = walletBalance - amount;
  const { data: dp } = await supabase
    .from('driver_profiles' as any)
    .select('total_withdrawn')
    .eq('user_id', userId)
    .single();
  const newWithdrawn = ((dp as any)?.total_withdrawn ?? 0) + amount;

  await supabase
    .from('driver_profiles' as any)
    .update({ wallet_balance: newBalance, total_withdrawn: newWithdrawn } as any)
    .eq('user_id', userId);
}
