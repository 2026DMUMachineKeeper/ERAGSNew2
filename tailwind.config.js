/** @type {import('tailwindcss').Config} */
const fontSize = {
  ff: ['70px', { lineHeight: '58px', fontWeight: '900' }],
  display: ['48px', { lineHeight: '58px', fontWeight: '700' }],
  title: ['28px', { lineHeight: '34px', fontWeight: '700' }],
  title2: ['24px', { lineHeight: '30px', fontWeight: '700' }],
  body: ['16px', { lineHeight: '20px', fontWeight: '400' }],
  coment: ['12px', { lineHeight: '18px', fontWeight: '400' }],
};

const colors = {
  red: '#FF3B3B',
  camera_bg: '#FFFAF8',
  background: '#1A1D24',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#525D6D',
  lightGray: '#4A5B65',
  appBg: '#0F1116',
  sheetBg: '#0F172A',
  surface: '#22262E',
  surfaceAlt: '#181C24',
  surfaceInfo: '#1E2530',
  surfaceChip: '#2B2D31',
  successSurface: '#1C2F2C',
  dangerSurface: '#2A1D1D',
  borderMuted: '#363C46',
  borderSubtle: '#2B303A',
  textMuted: '#A5ACB8',
  textSubtle: '#8B93A1',
  textDim: '#7F8389',
  success: '#2ECC71',
  successStrong: '#12B76A',
  successText: '#BFE8D0',
  danger: '#AF2E26',
  dangerText: '#FF6B6B',
  dangerBright: '#FF4D4D',
  disabled: '#6B6F76',
  disabledDark: '#3A3A3A',
  placeholder: '#9CA3AF',
  warning: '#F59E0B',
  offWhite: '#E5E7EB',
  memoBg: '#F8F9FC',
  memoText: '#111827',
  memoSubText: '#6B7280',
  memoLine: '#EEF0F4',
  memoCard: '#FFFFFF',
  memoRed: '#FF3B3B',
  memoOrange: '#FF7A1A',
  memoGreen: '#2ECC71',
  memoBlue: '#2F7DFF',
  memoPurple: '#8A4DFF',
  memoPink: '#FF4FA3',
};

module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
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

module.exports.colors = colors;
