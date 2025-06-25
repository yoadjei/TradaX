import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@tradax/theme';

const Typography = ({
  variant = 'body1',
  children,
  style,
  color,
  numberOfLines,
  ellipsizeMode = 'tail',
  accessibilityLabel,
  ...props
}) => {
  const { theme } = useTheme();

  const getTypographyStyle = () => {
    const baseStyle = {
      color: color || theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
    };

    switch (variant) {
      case 'h1':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xxxl,
          lineHeight: theme.typography.lineHeight.xxxl,
          fontWeight: theme.typography.fontWeight.bold,
        };
      case 'h2':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xxl,
          lineHeight: theme.typography.lineHeight.xxl,
          fontWeight: theme.typography.fontWeight.bold,
        };
      case 'h3':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xl,
          lineHeight: theme.typography.lineHeight.xl,
          fontWeight: theme.typography.fontWeight.semiBold,
        };
      case 'h4':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.lg,
          lineHeight: theme.typography.lineHeight.lg,
          fontWeight: theme.typography.fontWeight.semiBold,
        };
      case 'body1':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.md,
          lineHeight: theme.typography.lineHeight.md,
          fontWeight: theme.typography.fontWeight.regular,
        };
      case 'body2':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.lineHeight.sm,
          fontWeight: theme.typography.fontWeight.regular,
        };
      case 'button':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.md,
          lineHeight: theme.typography.lineHeight.md,
          fontWeight: theme.typography.fontWeight.medium,
        };
      case 'caption':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.xs,
          lineHeight: theme.typography.lineHeight.xs,
          fontWeight: theme.typography.fontWeight.regular,
        };
      case 'label':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.lineHeight.sm,
          fontWeight: theme.typography.fontWeight.medium,
        };
      case 'display':
        return {
          ...baseStyle,
          fontSize: theme.typography.fontSize.display,
          lineHeight: theme.typography.lineHeight.display,
          fontWeight: theme.typography.fontWeight.bold,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <Text
      style={[getTypographyStyle(), style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </Text>
  );
};

export default Typography;
