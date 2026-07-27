export const WARM_PRINT = {
  light: {
    ground: "#faf6ef",
    ink: "#1c1917",
    body: "#3f3a35",
    faint: "#5c554e",
    accent: "#9c3c1c",
    accentForeground: "#faf6ef",
    border: "#9b8c7f",
  },
  dark: {
    ground: "#171412",
    ink: "#ece7de",
    body: "#c9c2b7",
    faint: "#a49a8e",
    accent: "#d98d63",
    accentForeground: "#171412",
    border: "#6f6258",
  },
  print: {
    ground: "#ffffff",
    ink: "#0d0d0d",
    body: "#333333",
    faint: "#595959",
    accent: "#7a2f16",
    accentForeground: "#ffffff",
    border: "#808080",
  },
} as const;

type WarmPrintPalette = (typeof WARM_PRINT)[keyof typeof WARM_PRINT];

export type WarmPrintColor = WarmPrintPalette[keyof WarmPrintPalette];
