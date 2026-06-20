import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { theme } from "../theme";

const LOGO = require("../../assets/brand-logo.png");

/**
 * mem-it brand mark: the head-with-asterisk logo in a dark rounded chip
 * (matching the app icon) so it reads cleanly on the warm light canvas.
 * Pass `wordmark` to show the "mem-it" lockup next to the icon.
 */
export function BrandMark({
  size = 36,
  wordmark = false,
}: {
  size?: number;
  wordmark?: boolean;
}) {
  const radius = size * 0.28;
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.chip,
          { width: size, height: size, borderRadius: radius },
        ]}
      >
        <Image source={LOGO} style={styles.logo} resizeMode="cover" />
      </View>
      {wordmark && <Text style={styles.wordmark}>mem-it</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: theme.space.sm },
  chip: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: theme.color.glassBorder,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "100%", height: "100%" },
  wordmark: {
    color: theme.color.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
