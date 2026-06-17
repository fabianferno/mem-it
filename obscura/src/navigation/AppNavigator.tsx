import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { CameraScreen } from "../camera/CameraScreen";
import { StylePicker } from "../camera/StylePicker";
import { DarkroomScreen } from "../darkroom/DarkroomScreen";
import { ResultScreen } from "../result/ResultScreen";
import { DownloadScreen } from "../download/DownloadScreen";
import { SettingsScreen } from "../settings/SettingsScreen";
import { getPreset } from "../qvac/presets";
import { installLifecycle } from "../qvac/client";
import { enableProfiler, writePerfLog } from "../perf/perfLog";
import { useGallery } from "../gallery/useGallery";
import type { PipelineResult } from "../types";

const SENTINEL = `${FileSystem.documentDirectory}models-ready`;

type Screen =
  | { name: "camera" }
  | { name: "pick"; photoUri: string }
  | { name: "darkroom"; photoUri: string; presetId: string }
  | { name: "result"; result: PipelineResult }
  | { name: "settings" };

export function AppNavigator() {
  const [screen, setScreen] = useState<Screen>({ name: "camera" });
  const [modelsReady, setModelsReady] = useState<"unknown" | "needed" | "ready">("unknown");
  const gallery = useGallery();

  useEffect(() => {
    enableProfiler();
    const off = installLifecycle();
    // Check sentinel file for first-run gate
    FileSystem.getInfoAsync(SENTINEL).then((info) => {
      setModelsReady(info.exists ? "ready" : "needed");
    });
    return off;
  }, []);

  // First-run gate: block until sentinel exists
  if (modelsReady === "unknown") return null;
  if (modelsReady === "needed") {
    return (
      <DownloadScreen
        onReady={async () => {
          await FileSystem.writeAsStringAsync(SENTINEL, "1");
          setModelsReady("ready");
        }}
      />
    );
  }

  switch (screen.name) {
    case "camera":
      return (
        <>
          <CameraScreen onCaptured={(photoUri) => setScreen({ name: "pick", photoUri })} />
          <Pressable style={styles.gear} onPress={() => setScreen({ name: "settings" })}>
            <Text style={styles.gearText}>⚙</Text>
          </Pressable>
        </>
      );
    case "pick":
      return (
        <StylePicker
          photoUri={screen.photoUri}
          onRetake={() => setScreen({ name: "camera" })}
          onPick={(presetId) => setScreen({ name: "darkroom", photoUri: screen.photoUri, presetId })}
        />
      );
    case "darkroom":
      return (
        <DarkroomScreen
          photoUri={screen.photoUri}
          preset={getPreset(screen.presetId)!}
          onDone={async (result) => {
            await writePerfLog(result.perf, result.caption);
            await gallery.add(result);
            setScreen({ name: "result", result });
          }}
          onCancelled={() => setScreen({ name: "camera" })}
          onError={(message, retriable) => {
            Alert.alert("Darkroom error", message, [
              retriable ? { text: "Retry", onPress: () => setScreen({ name: "darkroom", photoUri: screen.photoUri, presetId: screen.presetId }) } : { text: "OK" },
              { text: "Back to camera", onPress: () => setScreen({ name: "camera" }) },
            ]);
          }}
        />
      );
    case "result":
      return <ResultScreen result={screen.result} onDiscard={() => setScreen({ name: "camera" })} />;
    case "settings":
      return (
        <SettingsScreen
          onBack={() => setScreen({ name: "camera" })}
          onCacheCleared={() => {
            setModelsReady("needed");
            setScreen({ name: "camera" });
          }}
        />
      );
  }
}

const styles = StyleSheet.create({
  gear: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  gearText: { color: "#fff", fontSize: 20 },
});
