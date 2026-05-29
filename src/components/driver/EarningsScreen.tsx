/**
 * EarningsScreen — port of EarningsTab.tsx
 *
 * Shows wallet balance, today/week/month earnings cards, and withdrawal modal.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchEarnings,
  submitWithdrawal,
  type EarningsSummary,
} from '@/api/earnings';
import { JihColors } from '@/constants/theme';
import { formatUsd } from '@/lib/currency';

const BANKS = ['Wing', 'ABA'];

export default function EarningsScreen() {
  const { user } = useAuth();

  const [summary,        setSummary]        = useState<EarningsSummary | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [showWithdraw,   setShowWithdraw]   = useState(false);
  const [withdrawing,    setWithdrawing]    = useState(false);
  const [amount,         setAmount]         = useState('');
  const [bank,           setBank]           = useState('');
  const [accountNumber,  setAccountNumber]  = useState('');
  const [accountHolder,  setAccountHolder]  = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { summary: s } = await fetchEarnings(user.id);
      setSummary(s);
      setLoading(false);
    })();
  }, [user]);

  const handleWithdraw = async () => {
    if (!user || !summary) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid withdrawal amount.');
      return;
    }
    if (amt > summary.walletBalance) {
      Alert.alert('Insufficient balance', 'Amount exceeds your wallet balance.');
      return;
    }
    setWithdrawing(true);
    try {
      await submitWithdrawal(user.id, summary.walletBalance, {
        amount: amt, bankName: bank, accountNumber, accountHolder,
      });
      const last4 = accountNumber.slice(-4);
      Alert.alert('Withdrawal submitted', `$${amt.toFixed(2)} to ${bank} ****${last4} is being processed.`);
      setSummary(prev => prev ? { ...prev, walletBalance: prev.walletBalance - amt } : prev);
      setShowWithdraw(false);
      setAmount(''); setBank(''); setAccountNumber(''); setAccountHolder('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={JihColors.gold} size="large" />
      </View>
    );
  }

  if (!summary) return null;

  const stats = [
    { label: "Today's Earnings",  value: summary.todayAmount,  count: summary.todayRides },
    { label: 'This Week',         value: summary.weekAmount,   count: summary.weekRides  },
    { label: 'This Month',        value: summary.monthAmount,  count: summary.monthRides },
  ];

  const canWithdraw = summary.walletBalance > 0;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>

      {/* Wallet card */}
      <View style={s.walletCard}>
        <View style={s.walletHeader}>
          <Text style={s.walletLabel}>💳 Wallet Balance</Text>
          <Pressable
            style={[s.withdrawBtn, !canWithdraw && s.withdrawBtnDisabled]}
            onPress={() => setShowWithdraw(true)}
            disabled={!canWithdraw}
          >
            <Text style={s.withdrawBtnText}>⬇ Withdraw</Text>
          </Pressable>
        </View>
        <Text style={s.walletAmount}>{formatUsd(summary.walletBalance)}</Text>
        <Text style={s.keepNote}>You keep 100% of your fares</Text>
      </View>

      {/* Stat cards */}
      {stats.map(stat => (
        <View key={stat.label} style={s.statCard}>
          <Text style={s.statLabel}>{stat.label}</Text>
          <Text style={s.statAmount}>{formatUsd(stat.value)}</Text>
          <Text style={s.statCount}>{stat.count} ride{stat.count !== 1 ? 's' : ''}</Text>
        </View>
      ))}

      {/* Withdrawal modal */}
      <Modal visible={showWithdraw} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Withdraw Funds</Text>

            {/* Balance reminder */}
            <View style={s.balanceRow}>
              <Text style={s.balanceLabel}>Available</Text>
              <Text style={s.balanceAmount}>{formatUsd(summary.walletBalance)}</Text>
            </View>

            <TextInput
              style={s.input}
              placeholder={`Amount (max ${formatUsd(summary.walletBalance)})`}
              placeholderTextColor={JihColors.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Bank selector */}
            <Text style={s.inputLabel}>Bank</Text>
            <View style={s.bankRow}>
              {BANKS.map(b => (
                <Pressable
                  key={b}
                  style={[s.bankOption, bank === b && s.bankOptionSelected]}
                  onPress={() => setBank(b)}
                >
                  <Text style={[s.bankOptionText, bank === b && s.bankOptionTextSelected]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={s.input}
              placeholder="Account number"
              placeholderTextColor={JihColors.muted}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
            />
            <TextInput
              style={s.input}
              placeholder="Account holder name"
              placeholderTextColor={JihColors.muted}
              value={accountHolder}
              onChangeText={setAccountHolder}
            />

            <Pressable
              style={[
                s.confirmBtn,
                (!amount || !bank || !accountNumber || !accountHolder || withdrawing) && s.confirmBtnDisabled,
              ]}
              onPress={handleWithdraw}
              disabled={!amount || !bank || !accountNumber || !accountHolder || withdrawing}
            >
              {withdrawing
                ? <ActivityIndicator color={JihColors.navy} />
                : <Text style={s.confirmBtnText}>Confirm Withdrawal</Text>
              }
            </Pressable>

            <Pressable style={s.cancelBtn} onPress={() => setShowWithdraw(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: JihColors.navy },
  content: { padding: 16, gap: 12 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Wallet
  walletCard: {
    backgroundColor: JihColors.navyM, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: JihColors.gold + '30',
  },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  walletLabel:  { color: JihColors.muted, fontSize: 14, fontWeight: '500' },
  walletAmount: { fontSize: 36, fontWeight: '800', color: '#4ade80' },
  keepNote:     { color: JihColors.muted, fontSize: 12, marginTop: 4 },
  withdrawBtn: {
    backgroundColor: JihColors.gold, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  withdrawBtnDisabled: { opacity: 0.4 },
  withdrawBtnText:     { color: JihColors.navy, fontWeight: '700', fontSize: 13 },

  // Stat cards
  statCard: {
    backgroundColor: JihColors.navyM, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: JihColors.navyXL,
  },
  statLabel:  { color: JihColors.muted, fontSize: 13, marginBottom: 4 },
  statAmount: { fontSize: 32, fontWeight: '800', color: JihColors.gold },
  statCount:  { color: JihColors.muted, fontSize: 12, marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: JihColors.navyM, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 12,
  },
  modalTitle: { color: JihColors.white, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  balanceRow: {
    backgroundColor: JihColors.navyXL, borderRadius: 10, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  balanceLabel:  { color: JihColors.muted, fontSize: 13 },
  balanceAmount: { color: '#4ade80', fontSize: 20, fontWeight: '700' },
  inputLabel:    { color: JihColors.muted, fontSize: 13 },
  input: {
    backgroundColor: JihColors.navyXL, color: JihColors.white,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    borderWidth: 1, borderColor: JihColors.navyL,
  },
  bankRow:             { flexDirection: 'row', gap: 10 },
  bankOption: {
    flex: 1, borderRadius: 10, borderWidth: 1.5,
    borderColor: JihColors.navyXL, paddingVertical: 12, alignItems: 'center',
  },
  bankOptionSelected:  { borderColor: JihColors.gold, backgroundColor: JihColors.gold + '20' },
  bankOptionText:      { color: JihColors.muted, fontWeight: '600', fontSize: 14 },
  bankOptionTextSelected: { color: JihColors.gold },
  confirmBtn: {
    backgroundColor: JihColors.gold, borderRadius: 10,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: JihColors.navy, fontWeight: '700', fontSize: 16 },
  cancelBtn:  { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: JihColors.muted, fontSize: 15 },
});
