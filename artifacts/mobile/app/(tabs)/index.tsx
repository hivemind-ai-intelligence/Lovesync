import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/context/AuthContext';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Extract each button as its own component so hooks are not called inside .map()
function QuickButton({
  icon,
  label,
  onPress,
  delay,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  delay: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 480 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 130 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.quickBtnWrapper, style]}>
      <TouchableOpacity
        style={styles.quickBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.78}
      >
        <View style={styles.quickBtnIcon}>
          <Ionicons name={icon as any} size={26} color="#7C5CFF" />
        </View>
        <Text style={styles.quickBtnLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { username } = useAuth();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(new Date());

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-18);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 550 });
    headerY.value = withSpring(0, { damping: 22, stiffness: 130 });

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top;
  const paddingBottom = insets.bottom + (Platform.OS === 'web' ? 34 : 90);

  return (
    <AuroraBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: paddingTop + 20, paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status row */}
        <Animated.View style={[styles.statusRow, headerStyle]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Connected</Text>
        </Animated.View>

        {/* Greeting */}
        <Animated.View style={headerStyle}>
          <Text style={styles.greeting}>Welcome Back</Text>
          <Text style={styles.name}>{username ?? 'OurRoom'}</Text>
          <Text style={styles.tagline}>Together feels better.</Text>
        </Animated.View>

        {/* Clock card */}
        <GlassCard style={styles.clockCard}>
          <View style={styles.clockContent}>
            <Text style={styles.clock}>{formatTime(now)}</Text>
            <Text style={styles.dateText}>{formatDate(now)}</Text>
          </View>
        </GlassCard>

        {/* Quick action grid — separate components, no hooks in loops */}
        <View style={styles.grid}>
          <QuickButton
            icon="musical-notes"
            label="Music Room"
            onPress={() => router.navigate('/music')}
            delay={180}
          />
          <QuickButton
            icon="chatbubble-ellipses"
            label="Chat"
            onPress={() => router.navigate('/chat')}
            delay={270}
          />
          <QuickButton
            icon="heart"
            label="Our Space"
            onPress={() => {}}
            delay={360}
          />
          <QuickButton
            icon="settings"
            label="Settings"
            onPress={() => router.navigate('/settings')}
            delay={450}
          />
        </View>

        {/* Room info card */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Room Status</Text>

            <View style={styles.infoRow}>
              <Ionicons name="moon" size={16} color="#A6A9B5" />
              <Text style={styles.infoLabel}>Theme</Text>
              <Text style={styles.infoValue}>Dark Cosmos</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: '#4CFF7C' }]} />
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>Online</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="home" size={16} color="#A6A9B5" />
              <Text style={styles.infoLabel}>Room</Text>
              <Text style={styles.infoValue}>Active</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="heart" size={16} color="#FF5C7C" />
              <Text style={styles.infoLabel}>Members</Text>
              <Text style={styles.infoValue}>Vasudev {'&'} Sana</Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4CFF7C',
  },
  statusText: {
    color: '#A6A9B5',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.4,
  },
  greeting: {
    color: '#A6A9B5',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    lineHeight: 44,
    textTransform: 'capitalize',
  },
  tagline: {
    color: '#7C5CFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 6,
    letterSpacing: 0.4,
  },
  clockCard: {},
  clockContent: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  clock: {
    color: '#FFFFFF',
    fontSize: 52,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  dateText: {
    color: '#A6A9B5',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickBtnWrapper: {
    width: '47.5%',
  },
  quickBtn: {
    backgroundColor: 'rgba(124,92,255,0.09)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.22)',
    padding: 20,
    gap: 14,
  },
  quickBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(124,92,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  infoCard: {},
  infoContent: {
    padding: 20,
    gap: 14,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  infoLabel: {
    color: '#A6A9B5',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
