/** Site look the artist can change from the studio panel. */
export const THEME_KEYS = {
  theme_bg: { label: "Background colour", css: "--color-paper", default: "#f4ede0" },
  theme_card: { label: "Card colour", css: "--color-card", default: "#faf5e9" },
  theme_text: { label: "Text colour", css: "--color-ink", default: "#2a241c" },
  theme_accent: { label: "Accent colour", css: "--color-sun", default: "#c05a2e" },
} as const;

export type ThemeKey = keyof typeof THEME_KEYS;

export const DISPLAY_FONTS = [
  "Fraunces",
  "Playfair Display",
  "Cormorant Garamond",
  "DM Serif Display",
  "Libre Baskerville",
  "Lora",
  "Syne",
  "Space Grotesk",
];
export const BODY_FONTS = [
  "Inter",
  "Karla",
  "Work Sans",
  "Nunito Sans",
  "DM Sans",
  "Lora",
  "IBM Plex Sans",
  "Figtree",
];

export const DEFAULT_FONTS = { font_display: "Fraunces", font_body: "Inter" };

const isHex = (v: string) => /^#[0-9a-f]{3,8}$/i.test(v);

/** Applies saved colours and fonts to the page. Browser only. */
export function applyTheme(content: Record<string, string>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [key, def] of Object.entries(THEME_KEYS)) {
    const value = content[key];
    if (value && isHex(value)) root.style.setProperty(def.css, value);
    else root.style.removeProperty(def.css);
  }
  const display = content["font_display"] || DEFAULT_FONTS.font_display;
  const body = content["font_body"] || DEFAULT_FONTS.font_body;
  root.style.setProperty("--font-display", `"${display}", Georgia, serif`);
  root.style.setProperty("--font-body", `"${body}", system-ui, sans-serif`);
  loadFonts([display, body]);
}

export function loadFonts(families: string[]) {
  if (typeof document === "undefined") return;
  const id = "marjike-theme-fonts";
  const href =
    "https://fonts.googleapis.com/css2?" +
    Array.from(new Set(families))
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600`)
      .join("&") +
    "&display=swap";
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}
