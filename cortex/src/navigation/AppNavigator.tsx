import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";
import { MeetingsScreen } from "../screens/MeetingsScreen";
import { MeetingDetailScreen } from "../screens/MeetingDetailScreen";
import { RecordScreen } from "../screens/RecordScreen";
import { BrainScreen } from "../screens/BrainScreen";
import { AskScreen } from "../screens/AskScreen";
import { TodosScreen } from "../screens/TodosScreen";
import { ProcessingBanner } from "../ui/ProcessingBanner";

type Screen =
  | { name: "meetings" }
  | { name: "record" }
  | { name: "detail"; meetingId: string }
  | { name: "todos" }
  | { name: "brain" }
  | { name: "ask" };

type Tab = "meetings" | "todos" | "brain" | "ask";
const TABS: Tab[] = ["meetings", "todos", "brain", "ask"];

export function AppNavigator() {
  const [screen, setScreen] = useState<Screen>({ name: "meetings" });
  const tab: Tab | null = (TABS as string[]).includes(screen.name) ? (screen.name as Tab) : null;

  function body() {
    switch (screen.name) {
      case "meetings":
        return <MeetingsScreen onOpen={(meetingId) => setScreen({ name: "detail", meetingId })} />;
      case "record":
        return (
          <RecordScreen
            onReview={(meetingId) => setScreen({ name: "detail", meetingId })}
            onCancel={() => setScreen({ name: "meetings" })}
          />
        );
      case "detail":
        return (
          <MeetingDetailScreen
            meetingId={screen.meetingId}
            onBack={() => setScreen({ name: "meetings" })}
          />
        );
      case "todos":
        return <TodosScreen />;
      case "brain":
        return <BrainScreen />;
      case "ask":
        return <AskScreen />;
    }
  }

  return (
    <View style={styles.root}>
      {screen.name !== "record" && <ProcessingBanner />}
      <View style={styles.body}>{body()}</View>
      {tab && (
        <View style={styles.tabbar}>
          <NavTab
            label="Meetings"
            active={tab === "meetings"}
            onPress={() => setScreen({ name: "meetings" })}
            render={(color, size) => <Ionicons name="list" color={color} size={size} />}
          />
          <NavTab
            label="Todos"
            active={tab === "todos"}
            onPress={() => setScreen({ name: "todos" })}
            render={(color, size) => (
              <Ionicons name="checkmark-done" color={color} size={size} />
            )}
          />

          <Pressable style={styles.recordFab} onPress={() => setScreen({ name: "record" })}>
            <Ionicons name="mic" color={theme.color.onAccent} size={28} />
          </Pressable>

          <NavTab
            label="Brain"
            active={tab === "brain"}
            onPress={() => setScreen({ name: "brain" })}
            render={(color, size) => (
              <MaterialCommunityIcons name="brain" color={color} size={size} />
            )}
          />
          <NavTab
            label="Ask"
            active={tab === "ask"}
            onPress={() => setScreen({ name: "ask" })}
            render={(color, size) => <Ionicons name="search" color={color} size={size} />}
          />
        </View>
      )}
    </View>
  );
}

function NavTab({
  label,
  active,
  onPress,
  render,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  render: (color: string, size: number) => React.ReactNode;
}) {
  const color = active ? theme.color.ink : theme.color.textMuted;
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      {render(color, 24)}
      <Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  body: { flex: 1 },
  tabbar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.color.glassBorder,
    backgroundColor: theme.color.surface,
    paddingBottom: theme.space.lg,
    paddingTop: theme.space.sm,
  },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  tabText: { color: theme.color.textMuted, ...theme.type.caption },
  tabActive: { color: theme.color.ink, fontWeight: "700" },
  recordFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -28, // lift above the bar
    marginHorizontal: theme.space.sm,
    backgroundColor: theme.color.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: theme.color.bg,
  },
  recordDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
});
