import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import { AppNavigator } from "./navigation/AppNavigator";
import { installLifecycle } from "./qvac/lifecycle";
import { enableProfiler } from "./perf/perfLog";
import { openDb } from "./db/sqlite";

export default function App() {
  useEffect(() => {
    openDb(); // create tables on first launch
    enableProfiler();
    const off = installLifecycle();
    return off;
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaView>
  );
}
