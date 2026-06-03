import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDriver } from '@/contexts/DriverContext';
import { JihColors } from '@/constants/theme';
import RequestsScreen   from '@/components/driver/RequestsScreen';
import ActiveRideScreen from '@/components/driver/ActiveRideScreen';
import EarningsScreen   from '@/components/driver/EarningsScreen';
import ProfileScreen    from '@/components/driver/ProfileScreen';
import SupportScreen    from '@/components/driver/SupportScreen';

type AppStatus = 'loading' | 'no_user' | 'no_application' | 'pending' | 'rejected' | 'approved';
type TabKey    = 'requests' | 'active' | 'earnings' | 'profile' | 'support';

const TABS: { key: TabKey; label: string; sf: import('expo-symbols').SymbolViewProps['name'] }[] = [
  { key: 'requests', label: 'Requests', sf: 'antenna.radiowaves.left.and.right' },
  { key: 'active',   label: 'Active',   sf: 'map.fill' },
  { key: 'earnings', label: 'Earnings', sf: 'banknote.fill' },
  { key: 'profile',  label: 'Profile',  sf: 'person.fill' },
  { key: 'support',  label: 'Support',  sf: 'headphones' },
];

export default function DriverDashboard() {
  const { user, loading: authLoading, role, signOut } = useAuth();
  const { activeRideId }          = useDriver();
  const [activeTab, setActiveTab] = useState<TabKey>('requests');
  const [appStatus, setAppStatus] = useState<AppStatus>('loading');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setAppStatus('no_user');
      return;
    }

    if (role === 'driver') {
      setAppStatus('approved');
      return;
    }

    (async () => {
      try {
        const { data: app } = await supabase
          .from('driver_applications')
          .select('status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!app || app.status === 'draft') setAppStatus('no_application');
        else if (app.status === 'pending')  setAppStatus('pending');
        else if (app.status === 'rejected') setAppStatus('rejected');
        else if (app.status === 'approved') setAppStatus('approved');
        else setAppStatus('no_application');
      } catch {
        setAppStatus('no_application');
      }
    })();
  }, [user, authLoading, role]);

  // Navigate away from the dashboard when not approved — must be after all hooks
  useEffect(() => {
    if (appStatus === 'no_user')             router.replace('/welcome');
    else if (appStatus === 'no_application') router.replace('/apply');
    else if (appStatus === 'pending')        router.replace('/pending');
    else if (appStatus === 'rejected')       router.replace('/rejected');
  }, [appStatus]);

  // ── Route ──────────────────────────────────────────────────────────────────

  if (appStatus === 'loading' || appStatus !== 'approved') {
    return (
      <View style={s.center}>
        <StatusBar style="light" />
        <Text style={s.loadingLogo}>jih</Text>
        <ActivityIndicator color={JihColors.gold} size="large" />
      </View>
    );
  }

  // ── Approved driver dashboard ──────────────────────────────────────────────

  const renderTab = () => {
    switch (activeTab) {
      case 'requests': return <RequestsScreen onRideAccepted={() => setActiveTab('active')} />;
      case 'active':   return <ActiveRideScreen onRideComplete={() => setActiveTab('requests')} onNoRide={() => setActiveTab('requests')} />;
      case 'earnings': return <EarningsScreen />;
      case 'profile':  return <ProfileScreen />;
      case 'support':  return <SupportScreen />;
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <SafeAreaView style={s.navWrap}>
        <View style={s.nav}>
          <Text style={s.logo}>jih</Text>
          <Pressable style={s.logoutBtn} onPress={signOut}>
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={s.content}>{renderTab()}</View>

      <View style={s.tabBar}>
        {TABS.map(tab => {
          const active  = activeTab === tab.key;
          const showDot = tab.key === 'active' && !!activeRideId;
          return (
            <Pressable key={tab.key} style={s.tabItem} onPress={() => setActiveTab(tab.key)}>
              <View>
                <SymbolView
                  name={tab.sf}
                  type="monochrome"
                  style={s.tabIcon}
                  tintColor={active ? JihColors.gold : JihColors.muted}
                  resizeMode="scaleAspectFit"
                />
                {showDot && <View style={s.activeDot} />}
              </View>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {Platform.OS === 'ios' && <View style={s.iosSafe} />}
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: JihColors.navy },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: JihColors.navy, gap: 20 },
  loadingLogo:    { fontSize: 40, fontWeight: '800', color: JihColors.gold, letterSpacing: -1 },
  navWrap:        { backgroundColor: JihColors.navy, borderBottomWidth: 1, borderBottomColor: JihColors.navyXL },
  nav:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  logo:           { fontSize: 28, fontWeight: '800', color: JihColors.gold, letterSpacing: -0.5 },
  logoutBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: JihColors.navyXL },
  logoutText:     { color: JihColors.white, fontSize: 13, opacity: 0.8 },
  content:        { flex: 1, backgroundColor: JihColors.navy },
  tabBar:         { flexDirection: 'row', backgroundColor: JihColors.navy, borderTopWidth: 1, borderTopColor: JihColors.navyXL, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 0 : 8 },
  tabItem:        { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon:        { width: 24, height: 24 },
  tabLabel:       { fontSize: 10, color: JihColors.muted, fontWeight: '500' },
  tabLabelActive: { color: JihColors.gold },
  activeDot:      { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: JihColors.gold },
  iosSafe:        { height: 20, backgroundColor: JihColors.navy },
});
