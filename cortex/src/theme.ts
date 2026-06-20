export const theme = {
  color: {
    bg: "#ECEBE6", // warm light canvas
    surface: "#FFFFFF", // white cards
    surfaceAlt: "#F4F3EF",
    ink: "#1A1A1C", // charcoal — dark cards + strong text/icons
    glassFill: "#FFFFFF", // cards are solid white on the light theme
    glassBorder: "rgba(0,0,0,0.08)", // hairline
    text: "#16160F", // near-black body text
    textOnDark: "#FFFFFF", // text over charcoal / the 3D graph
    textMuted: "#8C8C84", // muted grey
    accent: "#C8F000", // electric lime (signature)
    accentSoft: "#E4FF6B", // lighter lime for glows
    accentDim: "rgba(0,0,0,0.06)", // light track / pressed
    danger: "#E5484D",
    onAccent: "#1A1A1C", // text/icons on lime are dark
    accentWarm: "#E4FF6B", // kept for legacy glow usage
    graphBg: "#16161A", // dark canvas for the glowing brain graph
  },
  radius: { pill: 28, card: 26, circle: 999, sm: 14 },
  space: { xs: 6, sm: 12, md: 16, lg: 24, xl: 40 },
  type: {
    display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: 0.2, textTransform: "none" as const },
    heading: { fontSize: 22, fontWeight: "700" as const },
    body: { fontSize: 16, fontWeight: "400" as const },
    caption: { fontSize: 13, fontWeight: "500" as const },
  },
  blurIntensity: 24,
} as const;

export type Theme = typeof theme;
