/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./constants/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#ba002b', container: '#e5183b' },
        secondary: { DEFAULT: '#ab323b', container: '#ff7075' },
        tertiary: { DEFAULT: '#00685c' },
        surface: {
          DEFAULT: '#f9f9fb',
          dim: '#d9dadc',
          'container-lowest': '#ffffff',
          'container-low': '#f3f3f5',
          container: '#eeeef0',
          'container-high': '#e8e8ea',
          'container-highest': '#e2e2e4',
        },
        'on-surface': { DEFAULT: '#1a1c1d', variant: '#5d3f3f' },
        'on-primary': '#ffffff',
        outline: { DEFAULT: '#916e6e', variant: '#e6bdbc' },
      },
    },
  },
  plugins: [],
}