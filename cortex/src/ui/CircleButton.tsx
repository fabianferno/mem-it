import React from "react";
import { Pressable, View, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../theme";

export function CircleButton({ onPress, size = 76, children, style, filled = true }: {
  onPress?: () => void; size?: number; children?: React.ReactNode; style?: ViewStyle; filled?: boolean;
}) {
  return (
    <Pressable onPress={onPress}
      style={[{ width: size, height: size, borderRadius: theme.radius.circle,
        backgroundColor: filled ? theme.color.text : theme.color.glassFill,
        borderWidth: filled ? 4 : 1, borderColor: filled ? "#bbb" : theme.color.glassBorder,
        alignItems: "center", justifyContent: "center" }, style]}>
      <View>{children}</View>
    </Pressable>
  );
}
const _ = StyleSheet; // keep import parity
