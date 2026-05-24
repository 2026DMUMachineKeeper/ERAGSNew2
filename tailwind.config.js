/** @type {import('tailwindcss').Config} */
const fontSize = {
  ff: ['70px', { lineHeight: '58px', fontWeight: '900' }],
  display: ['48px', { lineHeight: '58px', fontWeight: '700' }],
  title: ['28px', { lineHeight: '34px', fontWeight: '700' }],
  title2: ['24px', { lineHeight: '30px', fontWeight: '700' }],
  body: ['16px', { lineHeight: '20px', fontWeight: '400' }],
  coment: ['12px', { lineHeight: '18px', fontWeight: '400' }],
};
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        red: '#FF3B3B',
        background: '#1A1D24',
        white: '#FFFFFF',
        gray: '#525D6D',
        lightGray: '#4A5B65',
      },
      fontFamily: {
        sultRegular: ['Sult-Regular', 'System'],
        sultMedium: ['Sult-Medium', 'System'],
        sultSemiBold: ['Sult-SemiBold', 'System'],
        sultBold: ['Sult-Bold', 'System'],
      },
      fontSize,
      spacing: {
        15: '60px',
      },
      letterSpacing: {
        erags: 2.4,
      },
    },
  },
  plugins: [],
};
