import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Each blob is a separate component — never call hooks inside .map()
function Blob1() {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(0.5);

  useEffect(() => {
    tx.value = withRepeat(
      withTiming(60, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    ty.value = withRepeat(
      withTiming(40, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    op.value = withRepeat(
      withTiming(0.8, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        { left: -width * 0.3, top: -height * 0.2, width: width * 0.9, height: width * 0.9 },
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(124,92,255,0.28)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

function Blob2() {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(0.3);

  useEffect(() => {
    tx.value = withDelay(
      2000,
      withRepeat(withTiming(-50, { duration: 10000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    ty.value = withDelay(
      1000,
      withRepeat(withTiming(50, { duration: 8000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    op.value = withDelay(
      1500,
      withRepeat(withTiming(0.55, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        { right: -width * 0.2, top: height * 0.3, width: width * 0.8, height: width * 0.8 },
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(159,132,255,0.22)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    </Animated.View>
  );
}

function Blob3() {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(0.2);

  useEffect(() => {
    tx.value = withDelay(
      500,
      withRepeat(withTiming(40, { duration: 11000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    ty.value = withDelay(
      3000,
      withRepeat(withTiming(-30, { duration: 7500, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    op.value = withDelay(
      800,
      withRepeat(withTiming(0.45, { duration: 8000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        { left: width * 0.05, bottom: -height * 0.15, width: width * 0.75, height: width * 0.75 },
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(92,63,255,0.22)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
}

// Fixed particle components — never call in a loop
function Particle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  const op = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 2200 }),
          withTiming(0.05, { duration: 2200 }),
        ),
        -1,
      ),
    );
    ty.value = withDelay(
      delay,
      withRepeat(withTiming(-14, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(159,132,255,0.85)',
        },
        style,
      ]}
    />
  );
}

export default function AuroraBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <Blob1 />
      <Blob2 />
      <Blob3 />

      <Particle x={width * 0.12} y={height * 0.22} delay={0} size={2} />
      <Particle x={width * 0.78} y={height * 0.13} delay={700} size={1.5} />
      <Particle x={width * 0.45} y={height * 0.58} delay={1400} size={2} />
      <Particle x={width * 0.88} y={height * 0.42} delay={350} size={1} />
      <Particle x={width * 0.22} y={height * 0.72} delay={1100} size={1.5} />
      <Particle x={width * 0.62} y={height * 0.33} delay={1800} size={1} />
      <Particle x={width * 0.33} y={height * 0.87} delay={550} size={2} />
      <Particle x={width * 0.91} y={height * 0.76} delay={1300} size={1.5} />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 1000,
    overflow: 'hidden',
  },
});
