/** @type {import('tailwindcss').Config} */
export default {
  // We are adding a comment here to force a rebuild of the CSS
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'border-green-500',
    'border-red-500',
    'border-blue-500',
    'border-gray-600',
    'focus:ring-green-500',
    'focus:ring-red-500',
    'focus:ring-blue-500',
    'focus:ring-gray-600',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};