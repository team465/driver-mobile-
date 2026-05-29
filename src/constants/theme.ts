import '@/global.css';

import { Platform } from 'react-native';

// Jih brand palette — mirrors jihwolrd/src/index.css exactly
export const JihColors = {
  // Navy scale
  navy:    '#111e2c', // rgb(17,  30,  44)
  navyM:   '#1b2a3b', // rgb(27,  42,  59)
  navyL:   '#253548', // rgb(37,  53,  72)
  navyXL:  '#2f4258', // rgb(47,  66,  88)

  // Gold scale
  gold:     '#e8a020', // rgb(232, 160,  32)
  goldL:    '#f5b83a', // rgb(245, 184,  58)
  goldD:    '#c4841a', // rgb(196, 132,  26)
  goldPale: '#fdf3e0', // rgb(253, 243, 224)

  // Neutral
  off:      '#f7f8fa', // rgb(247, 248, 250)
  muted:    '#6b7a8d', // rgb(107, 122, 141)
  border:   '#dde2e8', // rgb(221, 226, 232)

  // Fixed
  white:       '#ffffff',
  destructive: '#c0392b', // rgb(192,  57,  43)
  success:     '#22c55e',
  warning:     '#f59e0b',
} as const;

export type JihColor = keyof typeof JihColors;

// Light / dark semantic tokens — same mapping as index.css
export const Colors = {
  light: {
    background:    JihColors.off,
    foreground:    JihColors.navy,
    card:          JihColors.white,
    primary:       JihColors.gold,
    primaryFg:     JihColors.navy,
    secondary:     JihColors.navy,
    secondaryFg:   JihColors.white,
    muted:         JihColors.border,
    mutedFg:       JihColors.muted,
    accent:        JihColors.goldPale,
    accentFg:      JihColors.navy,
    border:        JihColors.border,
    destructive:   JihColors.destructive,
    success:       JihColors.success,

    // legacy keys kept for backwards compat
    text:               JihColors.navy,
    textSecondary:      JihColors.muted,
    backgroundElement:  JihColors.goldPale,
    backgroundSelected: JihColors.border,
  },
  dark: {
    background:    JihColors.navy,
    foreground:    JihColors.white,
    card:          JihColors.navyM,
    primary:       JihColors.gold,
    primaryFg:     JihColors.navy,
    secondary:     JihColors.navyL,
    secondaryFg:   JihColors.white,
    muted:         JihColors.navyL,
    mutedFg:       '#9ca3af',
    accent:        JihColors.navyXL,
    accentFg:      JihColors.gold,
    border:        JihColors.navyXL,
    destructive:   '#dc2626',
    success:       JihColors.success,

    // legacy keys
    text:               JihColors.white,
    textSecondary:      '#b0b4ba',
    backgroundElement:  JihColors.navyM,
    backgroundSelected: JihColors.navyL,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    'var(--font-display)',
    serif:   'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono:    'var(--font-mono)',
  },
});

export const Spacing = {
  half:  2,
  one:   4,
  two:   8,
  three: 16,
  four:  24,
  five:  32,
  six:   64,
} as const;

export const BorderRadius = {
  sm:  6,
  md:  10,
  lg:  12,
  xl:  16,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
