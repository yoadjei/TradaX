import React, { useState, forwardRef } from 'react';
import { TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@tradax/theme';
import Typography from './Typography';

const Input = forwardRef(({
  label,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  error,
  helperText,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  editable = true,
  style,
  inputStyle,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  accessibilityLabel,
  ...props
}, ref) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(!secureTextEntry);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const toggleSecureVisibility = () => {
    setIsSecureVisible(!isSecureVisible);
  };

  const getBorderColor = () => {
    if (error) return theme.colors.error;
    if (isFocused) return theme.colors.primary;
    return theme.colors.border;
  };

  const getInputContainerStyle = () => ({
    height: multiline ? undefined : theme.components.input.height,
    minHeight: multiline ? theme.components.input.height : undefined,
    borderRadius: theme.components.input.borderRadius,
    borderWidth: theme.components.input.borderWidth,
    borderColor: getBorderColor(),
    backgroundColor: editable ? theme.colors.background : theme.colors.surface,
    flexDirection: 'row',
    alignItems: multiline ? 'flex-start' : 'center',
    paddingHorizontal: theme.components.input.paddingHorizontal,
    paddingVertical: multiline ? theme.spacing.sm : 0,
  });

  const getInputStyle = () => ({
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    paddingVertical: multiline ? theme.spacing.xs : 0,
    textAlignVertical: multiline ? 'top' : 'center',
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Typography
          variant="label"
          style={[
            styles.label,
            { color: error ? theme.colors.error : theme.colors.textSecondary },
          ]}
        >
          {label}
        </Typography>
      )}
      
      <View style={[getInputContainerStyle(), style]}>
        {leftIcon && (
          <View style={[styles.iconContainer, styles.leftIcon]}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={ref}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry && !isSecureVisible}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          style={[getInputStyle(), inputStyle]}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            onPress={toggleSecureVisibility}
            style={[styles.iconContainer, styles.rightIcon]}
            accessibilityLabel={isSecureVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              {isSecureVisible ? '👁️' : '👁️‍🗨️'}
            </Typography>
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={[styles.iconContainer, styles.rightIcon]}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <Typography
          variant="caption"
          style={[
            styles.helperText,
            { color: error ? theme.colors.error : theme.colors.textSecondary },
          ]}
        >
          {error || helperText}
        </Typography>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    marginBottom: 6,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  helperText: {
    marginTop: 4,
    marginLeft: 2,
  },
});

Input.displayName = 'Input';

export default Input;
