import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@tradax/theme';
import Typography from './Typography';

const Button = ({
  title,
  onPress,
  variant = 'solid',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
  ...props
}) => {
  const { theme } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      height: theme.components.button.height[size],
      borderRadius: theme.components.button.borderRadius,
      paddingHorizontal: theme.components.button.paddingHorizontal,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    };

    switch (variant) {
      case 'solid':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.neutral : theme.colors.primary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: disabled ? theme.colors.border : theme.colors.primary,
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.neutral : theme.colors.success,
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.neutral : theme.colors.error,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontSize: size === 'sm' ? theme.typography.fontSize.sm : theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
    };

    switch (variant) {
      case 'solid':
      case 'success':
      case 'error':
        return {
          ...baseTextStyle,
          color: disabled ? theme.colors.textDisabled : '#ffffff',
        };
      case 'outline':
        return {
          ...baseTextStyle,
          color: disabled ? theme.colors.textDisabled : theme.colors.primary,
        };
      case 'text':
        return {
          ...baseTextStyle,
          color: disabled ? theme.colors.textDisabled : theme.colors.primary,
        };
      default:
        return baseTextStyle;
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'solid' || variant === 'success' || variant === 'error' ? '#ffffff' : theme.colors.primary}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Typography
            variant="button"
            style={[
              getTextStyle(),
              icon && { marginLeft: theme.spacing.sm },
              textStyle,
            ]}
          >
            {title}
          </Typography>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
