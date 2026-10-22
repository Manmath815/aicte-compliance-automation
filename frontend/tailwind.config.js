/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "#080c14",
        surface: "#0f172a",
        "surface-card": "#131d33",
        "surface-card-hover": "#17233d",
        "surface-border": "#1e293b",
        "surface-border-subtle": "#162032",
        primary: {
          DEFAULT: "#0284c7", // Sky 600
          hover: "#0369a1",
          light: "#38bdf8",
          subtle: "rgba(2, 132, 199, 0.12)",
        },
        cyan: {
          accent: "#06b6d4",
          subtle: "rgba(6, 182, 212, 0.12)",
        },
        compliance: {
          compliant: "#10b981", // Emerald 500
          incomplete: "#f59e0b", // Amber 500
          noncompliant: "#f43f5e", // Rose 500
          review: "#38bdf8", // Sky 400
          outdated: "#d97706", // Amber 600
          na: "#64748b", // Slate 500
        },
        risk: {
          low: "#10b981",
          medium: "#f59e0b",
          high: "#f97316",
          critical: "#ef4444",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
