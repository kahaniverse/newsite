// Kahaniverse brand palette — mirrors web/styles/globals.css CSS variables so the
// synthetic Remotion segments match the real app's chrome.
export const theme = {
  bg: "#191919", // --bg-primary (dark chrome)
  bgCard: "#1f1f1f", // --bg-card
  bgElevated: "#303030", // --bg-elevated
  brand: "#d22f27", // --brand (red, primary/CTA)
  brandLight: "#e0463e", // --brand-light
  accent: "#BB86FC", // --accent (mauve, secondary)
  accentLight: "#CBA6FD", // --accent-light
  accentDeep: "#6A0DAD", // --accent-deep
  text: "#e6e6e6", // --text-primary
  muted: "#a4a4a4", // --text-muted
  paper: "#f5edd6", // light "paper" content card
  paperInk: "#1a1208", // ink on paper
  border: "#2e2e2e", // --border
  font: '"Helvetica Neue", Helvetica, Arial, "Segoe UI", sans-serif',
} as const;
