/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f3',
          100: '#fde8e6',
          200: '#fcd5d2',
          300: '#f9b5b0',
          400: '#f48982',
          500: '#ea6e66',
          600: '#d64545',
          700: '#b23838',
          800: '#943235',
          900: '#7c2f33',
        },
        warm: {
          50: '#fefdf9',
          100: '#fdf9f1',
          200: '#faf0e4',
          300: '#f5e2cc',
          400: '#edcca3',
          500: '#e4b378',
          600: '#d49c54',
          700: '#b8804a',
          800: '#946643',
          900: '#785439',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}