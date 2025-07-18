import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Brand colors
  primary: '#1976D2', // Isang malinaw na asul
  secondary: '#2C3E50', // Isang dark slate color para sa text

  // Neutral colors
  white: '#FFFFFF',
  lightGray: '#F8F9FA', // Para sa background
  gray: '#95A5A6', // Para sa inactive/placeholder text
  darkGray: '#666666',

  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  info: '#2196F3',
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 16,
  padding2: 24,

  // Font sizes
  h1: 30,
  h2: 22,
  h3: 18,
  h4: 16,
  body1: 30,
  body2: 22,
  body3: 16,
  body4: 14,
  body5: 12,

  // App dimensions
  width,
  height,
};

export const FONTS = {
  h1: { fontSize: SIZES.h1, lineHeight: 36, fontWeight: 'bold' },
  h2: { fontSize: SIZES.h2, lineHeight: 30, fontWeight: '600' },
  h3: { fontSize: SIZES.h3, lineHeight: 22, fontWeight: '600' },
  h4: { fontSize: SIZES.h4, lineHeight: 22, fontWeight: '600' },
  body1: { fontSize: SIZES.body1, lineHeight: 36 },
  body2: { fontSize: SIZES.body2, lineHeight: 30 },
  body3: { fontSize: SIZES.body3, lineHeight: 22 },
  body4: { fontSize: SIZES.body4, lineHeight: 22 },
  body5: { fontSize: SIZES.body5, lineHeight: 22 },
};

const appTheme = { COLORS, SIZES, FONTS };

export default appTheme;