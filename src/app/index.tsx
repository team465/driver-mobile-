import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/contexts/AuthContext';
import { useDriver } from '@/contexts/DriverContext';
import { JihColors } from '@/constants/theme';
import RequestsScreen   from '@/components/driver/RequestsScreen';
import ActiveRideScreen from '@/components/driver/ActiveRideScreen';
import EarningsScreen   from '@/components/driver/EarningsScreen';
import ProfileScreen    from '@/components/driver/ProfileScreen';
import SupportScreen    from '@/components/driver/SupportScreen';

// ── Tab definitions (mirrors DriverDashboard.tsx tabs) ───────────────────────

const TABS = [
  { key: 'requests',  label: 'Requests',  icon: '📡' },
  { key: 'active',    label: 'Active',    icon: '🗺️' },
  { key: 'earnings',  label: 'Earnings',  icon: '💵' },
  { key: 'profile',   label: 'Profile',   icon: '👤' },
  { key: 'support',   label: 'Support',   icon: '🎧' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DriverDashboard() {
  const { user, loading, signOut } = useAuth();
  const { activeRideId }           = useDriver();
  const [activeTab, setActiveTab]  = useState<TabKey>('requests');

  // Show loading spinner while session hydrates
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={JihColors.gold} />
      </View>
    );
  }

  // Redirect unauthenticated users to login
  if (!user) return <Redirect href="/login" />;

  const renderTab = () => {
    switch (activeTab) {
      case 'requests':
        return (
          <RequestsScreen
            onRideAccepted={() => setActiveTab('active')}
          />
        );
      case 'active':
        return (
          <ActiveRideScreen
            onRideComplete={() => setActiveTab('requests')}
            onNoRide={() => setActiveTab('requests')}
          />
        );
      case 'earnings':
        return <EarningsScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'support':
        return <SupportScreen />;
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Top nav — mirrors DriverDashboard nav bar */}
      <SafeAreaView style={s.navWrap}>
        <View style={s.nav}>
          <Text style={s.logo}>jih</Text>
          <Pressable style={s.logoutBtn} onPress={signOut}>
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Tab content */}
      <View style={s.content}>{renderTab()}</View>

      {/* Bottom tab bar */}
      <View style={s.tabBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          // Show a dot on the Active tab when there's an active ride
          const showDot = tab.key === 'active' && !!activeRideId;
          return (
            <Pressable
              key={tab.key}
              style={s.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <View>
                <Text style={s.tabIcon}>{tab.icon}</Text>
                {showDot && <View style={s.dot} />}
              </View>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom safe area fill */}
      {Platform.OS === 'ios' && <View style={s.iosSafeBottom} />}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: JihColors.navy,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: JihColors.navy,
  },
  navWrap: {
    backgroundColor: JihColors.navy,
    borderBottomWidth: 1,
    borderBottomColor: JihColors.navyXL,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: JihColors.gold,
    letterSpacing: -0.5,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: JihColors.navyXL,
  },
  logoutText: {
    color: JihColors.white,
    fontSize: 13,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    backgroundColor: JihColors.navy,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: JihColors.navy,
    borderTopWidth: 1,
    borderTopColor: JihColors.navyXL,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    color: JihColors.muted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: JihColors.gold,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: JihColors.gold,
  },
  iosSafeBottom: {
    height: 20,
    backgroundColor: JihColors.navy,
  },
});
