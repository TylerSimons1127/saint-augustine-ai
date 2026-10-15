export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  hero: 48,
};
export const radius = { control: 8, card: 14, sheet: 22 };
export const light = {
  canvas: "#f6f2eb",
  paper: "#fffdf9",
  ink: "#263047",
  muted: "#606c7d",
  line: "#ddd8cf",
  primary: "#26344c",
  onPrimary: "#fffdf9",
  accent: "#d9c4a9",
  selected: "#eee4d6",
  success: "#2c6953",
  danger: "#a13333",
  overlay: "rgba(246,242,235,0.89)",
};
export const dark = {
  canvas: "#101925",
  paper: "#192435",
  ink: "#f6f2eb",
  muted: "#b4becc",
  line: "#354153",
  primary: "#e7d6bd",
  onPrimary: "#172235",
  accent: "#d9c4a9",
  selected: "#394356",
  success: "#87c8a9",
  danger: "#ffabab",
  overlay: "rgba(16,25,37,0.91)",
};
export type Palette = typeof light;
export const fonts = {
  body: "Hanken",
  medium: "HankenMedium",
  bold: "HankenBold",
  title: "Newsreader",
};
export const atmospheres = {
  cloister: {
    name: "Cloister morning",
    image: require("../assets/brand/bg_cloister-morning.jpg"),
  },
  coast: {
    name: "Coastal light",
    image: require("../assets/brand/bg_coastal-light.jpg"),
  },
  lake: {
    name: "Lake morning",
    image: require("../assets/brand/bg_lake-morning.jpg"),
  },
  autumn: {
    name: "Autumn light",
    image: require("../assets/brand/bg_autumn-light.jpg"),
  },
};
