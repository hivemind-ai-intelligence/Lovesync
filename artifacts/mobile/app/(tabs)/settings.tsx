import React from 'react';
import {
  Alert,
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
import * as Haptics from 'expo-haptics';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/context/AuthContext';

interface RowProps {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}

function InfoRow({ icon, label, value, accent }: RowProps) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={17} color={accent ? '#FF5C7C' : '#7C5CFF'} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { username, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert('Leave OurRoom?', 'You can always come back.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <AuroraBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: paddingTop + 16,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Profile */}
        <GlassCard style={styles.section}>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Ionicons name="heart" size={26} color="#7C5CFF" />
            </View>
            <View>
              <Text style={styles.profileName}>{username}</Text>
              <Text style={styles.profileRole}>OurRoom Member</Text>
            </View>
            <View style={[styles.activeDot]} />
          </View>
        </GlassCard>

        {/* About */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>About</Text>
            <InfoRow icon="heart" label="App" value="OURROOM" accent />
            <InfoRow icon="people" label="Members" value="Vasudev & Sana" />
            <InfoRow icon="sparkles" label="Version" value="1.0.0" />
            <InfoRow icon="lock-closed" label="Privacy" value="100% Private" />
            <InfoRow icon="globe" label="Access" value="By Invite Only" />
          </View>
        </GlassCard>

        {/* Appearance */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.row}>
              <Ionicons name="moon" size={17} color="#7C5CFF" />
              <Text style={styles.rowLabel}>Theme</Text>
              <View style={styles.themeBadge}>
                <Text style={styles.themeBadgeText}>Dark Cosmos</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Ionicons name="color-palette" size={17} color="#7C5CFF" />
              <Text style={styles.rowLabel}>Accent</Text>
              <View style={styles.accentSwatch} />
            </View>
          </View>
        </GlassCard>

        {/* Status */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Room Status</Text>
            <View style={styles.row}>
              <View style={styles.greenDot} />
              <Text style={styles.rowLabel}>Connection</Text>
              <Text style={styles.rowValue}>Online</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="home" size={17} color="#7C5CFF" />
              <Text style={styles.rowLabel}>Room</Text>
              <Text style={styles.rowValue}>Active</Text>
            </View>
          </View>
        </GlassCard>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
          testID="logout-button"
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Leave OurRoom</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Made with ♡ for Vasudev {'&'} Sana</Text>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  section: {},
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124,92,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.38)',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CFF7C',
    marginLeft: 'auto',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },
  profileRole: {
    color: '#7C5CFF',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  sectionContent: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    color: '#A6A9B5',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  rowValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  themeBadge: {
    backgroundColor: 'rgba(124,92,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.28)',
  },
  themeBadgeText: {
    color: '#9F84FF',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  accentSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C5CFF',
    borderWidth: 2,
    borderColor: 'rgba(124,92,255,0.4)',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CFF7C',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.28)',
    backgroundColor: 'rgba(255,59,48,0.05)',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  footer: {
    color: '#A6A9B5',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingTop: 4,
  },
});
