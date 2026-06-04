import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';

export interface ButtonProps {
  /** Visual style variant */
  variant?: 'dark' | 'light' | 'grey';
  /** Size variant */
  size?: 'medium' | 'large';
  /** Button contents */
  label: string;
  /** Optional click handler */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface ButtonGroupProps {
  variant?: 'mixed' | 'dark' | 'light';
  labels: Array<string>;
  onPress: Array<() => void>
}

export const Button = ({
  variant = 'dark',
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
        <Text style={[textStyles.buttonLabel, textModeStyle, textSizeStyle]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const ButtonGroup = ({
  variant = 'dark',
  labels,
  onPress
}: ButtonGroupProps) => {

  const buttonVariant = (index: number): ButtonProps['variant'] => {
    if (variant === 'mixed') return index === 0 ? 'light' : 'dark';
    if (variant === 'light') return 'light';
    return 'dark';
  };

  return (
    <View style={styles.buttonGroup}>
      {labels.map((label, index) => (
        <Button
          key={`${label}-${index}`}
          label={label}
          variant={buttonVariant(index)}
          onPress={onPress[index]}
        />
      ))}
    </View>
  )
}

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
  dark: {
    backgroundColor: colours.dark,
    borderColor: colours.light,
  },
  darkText: {
    color: colours.light,
  },
  light: {
    backgroundColor: colours.light,
    borderColor: colours.light,
  },
  lightText: {
    color: colours.dark,
  },
  grey: {
    backgroundColor: colours.inputBackground,
    borderColor: colours.buttonBorder,
  },
  greyText: {
    color: colours.dark,
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
  buttonGroup: {
    gap: 16
  }
});

const textSizeStyles = {
  medium: styles.mediumText,
  large: styles.largeText,
};
