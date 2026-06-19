import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";
import { MeetingsScreen } from "../screens/MeetingsScreen";
import { MeetingDetailScreen } from "../screens/MeetingDetailScreen";
import { RecordScreen } from "../screens/RecordScreen";
import { BrainScreen } from "../screens/BrainScreen";
import { AskScreen } from "../screens/AskScreen";

type Screen =
  | { name: "meetings" }
  | { name: "record" }
  | { name: "detail"; meetingId: string }
  | { name: "brain" }
  | { name: "ask" };

type Tab = "meetings" | "brain" | "ask";

export function AppNavigator() {
  const [screen, setScreen] = useState<Screen>({ name: "meetings" });
  const tab: Tab | null =
    screen.name === "meetings" || screen.name === "brain" || screen.name === "ask"
      ? screen.name
      : null;

  function body() {
    switch (screen.name) {
      case "meetings":
        return (
          <MeetingsScreen
            onOpen={(meetingId) => setScreen({ name: "detail", meetingId })}
            onRecord={() => setScreen({ name: "record" })}
          />
        );
      case "record":
        return <RecordScreen onDone={(meetingId) => setScreen({ name: "detail", meetingId })} />;
      case "detail":
        return (
          <MeetingDetailScreen
            meetingId={screen.meetingId}
            onBack={() => setScreen({ name: "meetings" })}
          />
        );
      case "brain":
        return <BrainScreen />;
      case "ask":
        return <AskScreen />;
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.body}>{body()}</View>
      {tab && (
        <View style={styles.tabbar}>
          {(["meetings", "brain", "ask"] as Tab[]).map((t) => (
            <Pressable key={t} style={styles.tab} onPress={() => setScreen({ name: t })}>
              <Text style={[styles.tabText, tab === t && styles.tabActive]}>{LABEL[t]}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const LABEL: Record<Tab, string> = { meetings: "Meetings", brain: "Brain", ask: "Ask" };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  body: { flex: 1 },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.color.glassBorder,
    backgroundColor: theme.color.surface,
    paddingBottom: theme.space.lg,
    paddingTop: theme.space.sm,
  },
  tab: { flex: 1, alignItems: "center" },
  tabText: { color: theme.color.textMuted, ...theme.type.caption },
  tabActive: { color: theme.color.accent },
});
