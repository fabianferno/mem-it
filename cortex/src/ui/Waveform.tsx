import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { theme } from "../theme";

const BARS = 28;

/** Animated bars that pulse while recording — signals "the AI is listening".
 *  Pure Animated (no audio metering dependency); staggered loops give an
 *  organic waveform feel. */
export function Waveform({ active }: { active: boolean }) {
  const vals = useRef(Array.from({ length: BARS }, () => new Animated.Value(0.2))).current;

  useEffect(() => {
    if (!active) {
      vals.forEach((v) => v.stopAnimation());
      return;
    }
    const loops = vals.map((v, i) => {
      const peak = 0.5 + 0.5 * Math.abs(Math.sin(i * 1.7)); // varied bar heights
      const up = Animated.timing(v, {
        toValue: peak,
        duration: 260 + (i % 5) * 70,
        useNativeDriver: true,
      });
      const down = Animated.timing(v, {
        toValue: 0.2,
        duration: 260 + (i % 5) * 70,
        useNativeDriver: true,
      });
      return Animated.loop(Animated.sequence([up, down]));
    });
    const anim = Animated.stagger(45, loops);
    anim.start();
    return () => {
      anim.stop();
      vals.forEach((v) => v.setValue(0.2));
    };
  }, [active]);

  return (
    <View style={styles.row}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={[styles.bar, { transform: [{ scaleY: v }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", height: 80, gap: 4 },
  bar: {
    width: 4,
    height: 80,
    borderRadius: 2,
    backgroundColor: theme.color.accent,
  },
});
