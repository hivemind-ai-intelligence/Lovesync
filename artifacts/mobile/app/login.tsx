import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const shakeX = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(32);
  const errorOpacity = useSharedValue(0);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 700 });
    cardY.value = withSpring(0, { damping: 22, stiffness: 120 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: shakeX.value }, { translateY: cardY.value }],
  }));

  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-13, { duration: 55 }),
      withTiming(13, { duration: 55 }),
      withTiming(-9, { duration: 55 }),
      withTiming(9, { duration: 55 }),
      withTiming(-5, { duration: 55 }),
      withTiming(5, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
  };

  const showError = (msg: string) => {
    setError(msg);
    errorOpacity.value = withTiming(1, { duration: 200 });
    shake();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showError('Please enter your credentials.');
      return;
    }

    setIsLoading(true);
    setError('');
    errorOpacity.value = 0;

    const success = await login(username.trim(), password);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      setIsLoading(false);
      showError('Wrong credentials. Try again.');
    }
  };

  const paddingBottom = Platform.OS === 'web' ? 34 : insets.bottom;
  const paddingTop = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <AuroraBackground>
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.container,
          { paddingTop: paddingTop + 24, paddingBottom: paddingBottom + 24 },
        ]}
      >
        <Animated.View style={[styles.cardWrapper, cardStyle]}>
          <GlassCard intensity={25} style={styles.card}>
            <View style={styles.cardContent}>
              {/* Logo */}
              <View style={styles.logoSection}>
                <View style={styles.heartContainer}>
                  <Ionicons name="heart" size={44} color="#7C5CFF" />
                </View>
                <Text style={styles.title}>OURROOM</Text>
                <Text style={styles.subtitle}>A place only for us.</Text>
              </View>

              {/* Inputs */}
              <View style={styles.inputs}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={17} color="#A6A9B5" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#A6A9B5"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    testID="username-input"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={17} color="#A6A9B5" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#A6A9B5"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    testID="password-input"
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={17}
                      color="#A6A9B5"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Error */}
              <Animated.View style={errorStyle}>
                {error ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color="#FF3B30" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : (
                  <View style={styles.errorPlaceholder} />
                )}
              </Animated.View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
                testID="login-button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Enter OurRoom</Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    width: '100%',
  },
  cardContent: {
    padding: 32,
    gap: 22,
  },
  logoSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  heartContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,92,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 7,
  },
  subtitle: {
    color: '#A6A9B5',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.3,
  },
  inputs: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 11,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    height: '100%',
  },
  eyeButton: {
    padding: 5,
    marginLeft: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  errorPlaceholder: {
    height: 18,
  },
  loginButton: {
    backgroundColor: '#7C5CFF',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
