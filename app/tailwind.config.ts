import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Base surfaces ────────────────────────────────
        vault: {
          bg:       "#0B0F14",   // deepest background
          surface:  "#111720",   // card / panel base
          elevated: "#171E2B",   // elevated surfaces, dropdowns
          border:   "#1E2A3A",   // default border
          "border-subtle": "#16202E", // very subtle dividers

          // ── Text ────────────────────────────────────
          text:     "#E8EDF2",   // primary text
          subtext:  "#8A9BB0",   // secondary / label text
          muted:    "#4A5A6E",   // disabled / placeholder

          // ── Accent (institutional indigo-slate) ──────
          accent:   "#4F7CFF",   // primary action
          "accent-dim": "#3560D4",
          "accent-glow": "rgba(79,124,255,0.15)",

          // ── Semantic ─────────────────────────────────
          success:  "#1DB87A",
          "success-dim": "rgba(29,184,122,0.12)",
          warning:  "#E6963C",
          "warning-dim": "rgba(230,150,60,0.12)",
          danger:   "#E05470",
          "danger-dim": "rgba(224,84,112,0.12)",

          // ── Solana purple (used sparingly) ───────────
          purple:   "#9B7FE8",
          "purple-dim": "rgba(155,127,232,0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
      },
      fontSize: {
        // Display
        "display-2xl": ["4.5rem",  { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-xl":  ["3.75rem", { lineHeight: "1.07", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-lg":  ["3rem",    { lineHeight: "1.1",  letterSpacing: "-0.02em",  fontWeight: "700" }],
        "display-md":  ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.018em", fontWeight: "700" }],
        "display-sm":  ["1.875rem",{ lineHeight: "1.2",  letterSpacing: "-0.015em", fontWeight: "600" }],
        // Headings
        "heading-xl":  ["1.5rem",  { lineHeight: "1.3",  letterSpacing: "-0.01em",  fontWeight: "600" }],
        "heading-lg":  ["1.25rem", { lineHeight: "1.35", letterSpacing: "-0.008em", fontWeight: "600" }],
        "heading-md":  ["1.125rem",{ lineHeight: "1.4",  letterSpacing: "-0.005em", fontWeight: "600" }],
        "heading-sm":  ["1rem",    { lineHeight: "1.5",  letterSpacing: "-0.003em", fontWeight: "600" }],
        // Body
        "body-lg":  ["1rem",     { lineHeight: "1.6" }],
        "body-md":  ["0.9375rem",{ lineHeight: "1.6" }],
        "body-sm":  ["0.875rem", { lineHeight: "1.55" }],
        "body-xs":  ["0.8125rem",{ lineHeight: "1.5" }],
        // Label / caption
        "label-lg": ["0.8125rem",{ lineHeight: "1.4", letterSpacing: "0.04em", fontWeight: "500" }],
        "label-md": ["0.75rem",  { lineHeight: "1.4", letterSpacing: "0.05em", fontWeight: "500" }],
        "label-sm": ["0.6875rem",{ lineHeight: "1.4", letterSpacing: "0.06em", fontWeight: "500" }],
      },
      borderRadius: {
        "2xs": "2px",
        xs:   "4px",
        sm:   "6px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        "2xl":"20px",
        "3xl":"28px",
      },
      boxShadow: {
        "card":         "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "card-hover":   "0 4px 16px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)",
        "modal":        "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)",
        "glow-accent":  "0 0 0 1px rgba(79,124,255,0.4), 0 0 20px rgba(79,124,255,0.12)",
        "glow-success": "0 0 0 1px rgba(29,184,122,0.35)",
        "glow-danger":  "0 0 0 1px rgba(224,84,112,0.35)",
        "inset-border": "inset 0 0 0 1px rgba(255,255,255,0.04)",
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
        "pulse-ring": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%":       { opacity: "1",   transform: "scale(1.05)" },
        },
        "count-up": {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in":      "fade-in 0.3s ease-out forwards",
        "slide-in-left":"slide-in-left 0.3s ease-out forwards",
        "shimmer":      "shimmer 1.8s infinite linear",
        "pulse-ring":   "pulse-ring 2s ease-in-out infinite",
        "count-up":     "count-up 0.4s ease-out forwards",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
