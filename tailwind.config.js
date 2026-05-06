/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./overlay.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#070811",
          soft: "#0d0f1c",
          panel: "#11142399",
          elevated: "#161a2e",
        },
        brand: {
          cyan: "#22d3ee",
          blue: "#3b82f6",
          indigo: "#6366f1",
          violet: "#8b5cf6",
          lilac: "#a78bfa",
          purple: "#7c3aed",
        },
        line: "#1f2340",
        muted: "#8a90b8",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Orbitron", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(139, 92, 246, 0.45)",
        "glow-cyan": "0 0 24px -4px rgba(34, 211, 238, 0.45)",
        panel: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)",
        "radial-violet":
          "radial-gradient(1200px 600px at 80% -10%, rgba(124,58,237,0.18), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(34,211,238,0.12), transparent 60%)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
