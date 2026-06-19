import React from "react";
import { Text, TextStyle } from "react-native";
import { theme } from "../theme";

export function DisplayHeading({ children, style, color = theme.color.text }: {
  children: React.ReactNode; style?: TextStyle; color?: string;
}) {
  return <Text style={[theme.type.display as TextStyle, { color }, style]}>{children}</Text>;
}
