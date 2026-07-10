/**
 * OURROOM design tokens — dark cosmos theme.
 * Both light and dark use the same dark palette since OURROOM is dark-only.
 */

const colors = {
  dark: {
    text: '#FFFFFF',
    tint: '#7C5CFF',
    background: '#05060A',
    foreground: '#FFFFFF',
    card: '#0E1117',
    cardForeground: '#FFFFFF',
    primary: '#7C5CFF',
    primaryForeground: '#FFFFFF',
    secondary: '#0E1117',
    secondaryForeground: '#FFFFFF',
    muted: '#161920',
    mutedForeground: '#A6A9B5',
    accent: '#9F84FF',
    accentForeground: '#FFFFFF',
    destructive: '#FF3B30',
    destructiveForeground: '#FFFFFF',
    border: 'rgba(255,255,255,0.12)',
    input: 'rgba(255,255,255,0.08)',
  },
  light: {
    // OURROOM is always dark — light and dark are identical
    text: '#FFFFFF',
    tint: '#7C5CFF',
    background: '#05060A',
    foreground: '#FFFFFF',
    card: '#0E1117',
    cardForeground: '#FFFFFF',
    primary: '#7C5CFF',
    primaryForeground: '#FFFFFF',
    secondary: '#0E1117',
    secondaryForeground: '#FFFFFF',
    muted: '#161920',
    mutedForeground: '#A6A9B5',
    accent: '#9F84FF',
    accentForeground: '#FFFFFF',
    destructive: '#FF3B30',
    destructiveForeground: '#FFFFFF',
    border: 'rgba(255,255,255,0.12)',
    input: 'rgba(255,255,255,0.08)',
  },
  radius: 24,
};

export default colors;
