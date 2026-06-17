import React, { useState } from "react";
import { View, Image, Pressable, Text, StyleSheet } from "react-native";

export function BeforeAfter({ originalUri, stylizedUri }: { originalUri: string; stylizedUri: string }) {
  const [showOriginal, setShowOriginal] = useState(false);
  return (
    <Pressable style={styles.fill} onPressIn={() => setShowOriginal(true)} onPressOut={() => setShowOriginal(false)}>
      <Image source={{ uri: showOriginal ? originalUri : stylizedUri }} style={styles.img} resizeMode="contain" />
      <Text style={styles.hint}>{showOriginal ? "Original" : "Stylized — hold to compare"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  img: { flex: 1 },
  hint: { position: "absolute", bottom: 12, alignSelf: "center", color: "#fff", opacity: 0.8 },
});
