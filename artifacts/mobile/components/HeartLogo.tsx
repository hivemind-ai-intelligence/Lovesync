import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeartLogoProps {
  size?: number;
  showText?: boolean;
  iconSize?: number;
}

export default function HeartLogo({ size = 72, showText = true, iconSize }: HeartLogoProps) {
  const resolvedIconSize = iconSize ?? size * 0.55;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons name="heart" size={resolvedIconSize} color="#7C5CFF" />
      </View>
      {showText && <Text style={styles.text}>OURROOM</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(124,92,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.3)',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 6,
  },
});
