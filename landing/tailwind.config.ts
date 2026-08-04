import type { Config } from 'tailwindcss';

// Same semantic token names/values as the mobile app's tailwind.config.js
// (../tailwind.config.js) — kept in sync by hand since this is a separate
// Next.js project. If the mobile palette changes, mirror it here too.
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'on-surface': '#131b2e',
        'primary-fixed': '#d6e3ff',
        secondary: '#5c5f61',
        background: '#faf8ff',
        'surface-container-lowest': '#ffffff',
        'primary-container': '#1a365d',
        'on-primary-container': '#86a0cd',
        'inverse-primary': '#adc7f7',
        primary: '#002045',
        error: '#ba1a1a',
        'surface-container-high': '#e2e7ff',
        'on-error-container': '#93000a',
        'on-primary': '#ffffff',
        'on-surface-variant': '#43474e',
        'on-secondary': '#ffffff',
        'surface-container': '#eaedff',
        'surface-variant': '#dae2fd',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-background': '#131b2e',
        'outline-variant': '#c4c6cf',
        surface: '#faf8ff',
        outline: '#74777f',
        'surface-container-highest': '#dae2fd',
        'surface-container-low': '#f2f3ff',
        'primary-fixed-dim': '#adc7f7',
        'secondary-container': '#e0e3e5',

        // Entrenar (Train) fixed-dark palette, used only for that one preview card
        'train-primary': '#c6bfff',
        'train-on-surface': '#dde4e6',
        'train-surface-variant': '#2f3638',
        'train-surface-container-low': '#161d1f',
        'train-surface-container': '#1a2123',
        'train-surface': '#0e1416',
        'train-surface-container-high': '#242b2d',
        'train-on-surface-variant': '#c8c4d7',
        'train-background': '#0e1416',
        'train-on-primary-container': '#faf6ff',
        'train-primary-container': '#6c5ce7',
      },
      fontFamily: {
        display: ['var(--font-jakarta)', 'sans-serif'],
        headline: ['var(--font-jakarta)', 'sans-serif'],
        body: ['var(--font-atkinson)', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
