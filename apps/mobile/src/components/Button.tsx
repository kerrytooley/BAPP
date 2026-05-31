import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ButtonProps {
  /** Visual style variant */
  variant?: 'primary' | 'light' | 'grey';
  /** Size variant */
  size?: 'medium' | 'large';
  /** Button contents */
  label: string;
  /** Optional click handler */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({
  variant = 'primary',
  size = 'large',
  label,
  style,
  onPress,
}: ButtonProps) => {
  const modeStyle = styles[variant];
  const textModeStyle = styles[`${variant}Text` as keyof typeof styles];

  const sizeStyle = styles[size];
  const textSizeStyle = textSizeStyles[size];

  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.6} onPress={onPress}>
      <View
        style={[
          styles.button,
          modeStyle,
          sizeStyle,
          style,
        ]}
      >
        <Text style={[textModeStyle, textSizeStyle]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 48,
    width: "100%",
    minWidth: 360,
    height: 48,
    borderStyle: "solid",
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: '700',
    lineHeight: 18,
    fontSize: 16,
    fontFamily: "Inter-Regular",
  },
  primary: {
    backgroundColor: "#000",
    borderColor: "#fff",
  },
  primaryText: {
    color: 'white',
  },
  light: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  lightText: {
    color: '#000',
  },
  grey: {
    backgroundColor: '#2c2c2e',
    borderColor: '#404040',
  },
  greyText: {
    color: '#000',
  },
  medium: {
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  mediumText: {
    fontSize: 14,
  },
  large: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  largeText: {
    fontSize: 16,
  },
});

const textSizeStyles = {
  medium: styles.mediumText,
  large: styles.largeText,
};
