export const theme = {
  color: {
    bg: "#000000", // pure black canvas
    surface: "#121214", // raised dark card
    surfaceAlt: "#191A1D",
    ink: "#FAFAF9", // strong light foreground — active states, icons, checkmarks
    glassFill: "rgba(255,255,255,0.06)", // translucent glass over black
    glassBorder: "rgba(255,255,255,0.12)", // hairline edge
    text: "#F5F5F4", // near-white body text
    textOnDark: "#FFFFFF", // text over the 3D graph
    textMuted: "#8B8B93", // muted grey
    accent: "#E53659", // signature crimson red (from red-black.png)
    accentSoft: "#FF5C78", // lighter red for glows
    accentDim: "rgba(229,54,89,0.16)", // tinted track / pressed
    danger: "#FF453A",
    onAccent: "#FFFFFF", // text/icons on red
    accentWarm: "#FF5C78", // glow companion
    graphBg: "#000000", // black canvas for the glowing brain graph
  },
  radius: { pill: 28, card: 22, circle: 999, sm: 14 },
  space: { xs: 6, sm: 12, md: 16, lg: 24, xl: 40 },
  type: {
    display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: 0.2, textTransform: "none" as const },
    heading: { fontSize: 22, fontWeight: "700" as const },
    body: { fontSize: 16, fontWeight: "400" as const },
    caption: { fontSize: 13, fontWeight: "500" as const },
  },
  blurIntensity: 30,
} as const;

export type Theme = typeof theme;
