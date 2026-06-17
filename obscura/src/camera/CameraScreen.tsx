import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useCamera } from "./useCamera";

export function CameraScreen({ onCaptured }: { onCaptured: (uri: string) => void }) {
  const { permission, requestPermission, ref, capture } = useCamera();

  if (!permission) return <View style={styles.fill} />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Obscura needs camera access.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}><Text style={styles.btnText}>Grant</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={ref} style={styles.fill} facing="back" />
      <View style={styles.shutterRow}>
        <Pressable
          style={styles.shutter}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const uri = await capture();
            if (uri) onCaptured(uri);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  text: { color: "#fff", marginBottom: 16 },
  btn: { backgroundColor: "#1f6feb", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "600" },
  shutterRow: { position: "absolute", bottom: 48, left: 0, right: 0, alignItems: "center" },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#fff", borderWidth: 4, borderColor: "#bbb" },
});
