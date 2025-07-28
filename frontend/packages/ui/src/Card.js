import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@tradax/theme';

const Card = ({
  children,
  style,
  elevated = true,
  padding = true,
  ...props
}) => {
  const { theme } = useTheme();

  const getCardStyle = () => {
    const baseStyle = {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.components.card.borderRadius,
    };

    if (padding) {
      baseStyle.padding = theme.components.card.padding;
    }

    if (elevated) {
      return {
        ...baseStyle,
        ...theme.components.card.shadow,
      };
    }

    return baseStyle;
  };

  return (
    <View
      style={[
        getCardStyle(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

export default Card;
