// Design tokens for TradaX application
export const colors = {
  // Light theme colors
  light: {
    // Primary brand colors
    primary: '#4a90e2',
    primaryDark: '#357abd',
    primaryLight: '#6fa8e8',
    
    // Secondary colors
    secondary: '#f39c12',
    secondaryDark: '#e67e22',
    secondaryLight: '#f5b041',
    
    // Background colors
    background: '#ffffff',
    surface: '#f8f9fa',
    surfaceElevated: '#ffffff',
    
    // Text colors
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    textDisabled: '#bdc3c7',
    
    // Status colors
    success: '#27ae60',
    successLight: '#2ecc71',
    error: '#e74c3c',
    errorLight: '#ec7063',
    warning: '#f39c12',
    warningLight: '#f4d03f',
    info: '#3498db',
    infoLight: '#5dade2',
    
    // Border and divider colors
    border: '#ecf0f1',
    borderDark: '#d5dbdb',
    divider: '#bdc3c7',
    
    // Trading specific colors
    bullish: '#27ae60',
    bearish: '#e74c3c',
    neutral: '#95a5a6',
  },
  
  // Dark theme colors
  dark: {
    // Primary brand colors
    primary: '#4a90e2',
    primaryDark: '#357abd',
    primaryLight: '#6fa8e8',
    
    // Secondary colors
    secondary: '#f39c12',
    secondaryDark: '#e67e22',
    secondaryLight: '#f5b041',
    
    // Background colors
    background: '#1a1a2e',
    surface: '#16213e',
    surfaceElevated: '#0f3460',
    
    // Text colors
    text: '#ecf0f1',
    textSecondary: '#bdc3c7',
    textDisabled: '#7f8c8d',
    
    // Status colors
    success: '#27ae60',
    successLight: '#2ecc71',
    error: '#e74c3c',
    errorLight: '#ec7063',
    warning: '#f39c12',
    warningLight: '#f4d03f',
    info: '#3498db',
    infoLight: '#5dade2',
    
    // Border and divider colors
    border: '#2c3e50',
    borderDark: '#34495e',
    divider: '#34495e',
    
    // Trading specific colors
    bullish: '#27ae60',
    bearish: '#e74c3c',
    neutral: '#95a5a6',
  },
};

// Spacing tokens
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Typography tokens
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 36,
    xxxl: 44,
    display: 52,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
};

// Border radius tokens
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

// Shadow tokens
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Animation tokens
export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Breakpoints for responsive design
export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: 32,
      md: 44,
      lg: 56,
    },
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadow: shadows.sm,
  },
  input: {
    height: 44,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
};
