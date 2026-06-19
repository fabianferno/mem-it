export const theme = {
  color: {
    bg: "#0A0A0B",          // near-black canvas (all three mockups)
    surface: "#141416",     // raised solid surface
    glassFill: "rgba(255,255,255,0.06)",   // frosted card/pill fill
    glassBorder: "rgba(255,255,255,0.14)", // hairline glass border
    text: "#FFFFFF",
    textMuted: "#9A9AA0",   // muted grey body
    accent: "#FF5B4A",      // safelight red (primary glow/accent)
    accentWarm: "#FF8A3D",  // amber end of the glow gradient
    accentDim: "#3A0D0A",   // dark red track for progress bars
    danger: "#B3261E",
    onAccent: "#FFFFFF",
  },
  radius: { pill: 28, card: 24, circle: 999, sm: 12 },
  space: { xs: 6, sm: 12, md: 16, lg: 24, xl: 40 },
  type: {
    display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: 2, textTransform: "uppercase" as const },
    heading: { fontSize: 22, fontWeight: "700" as const },
    body: { fontSize: 16, fontWeight: "400" as const },
    caption: { fontSize: 13, fontWeight: "500" as const },
  },
  blurIntensity: 30, // expo-blur intensity for glass surfaces
} as const;

export type Theme = typeof theme;
