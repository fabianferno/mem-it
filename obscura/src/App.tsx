import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import { AppNavigator } from "./navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaView>
  );
}
