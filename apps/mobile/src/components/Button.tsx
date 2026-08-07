import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts, textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';
import MapPin from '@assets/icons/mapPin.svg';
import Plus from '@assets/icons/plus.svg';
import RightArrow from '@assets/icons/rightArrow.svg';

export interface ButtonProps {
  variant?: 'dark' | 'light';
  size?: 'medium' | 'large';
  action?: 'add' | 'right arrow' | 'location'
  label: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface ButtonGroupProps {
  variant?: 'mixed' | 'dark' | 'light';
  labels: Array<string>;
  actions?: Array<"add" | "location" | "right arrow"> | "add" | "location" | "right arrow";
  disabled?: Array<boolean>;
  onPress: Array<() => void>
}

export const Button = ({
  variant = 'dark',
  size = 'large',
  action,
  label,
  style,
  disabled,
  onPress,
}: ButtonProps) => {
  const modeStyle = disabled ? styles.disabled : styles[variant];
  const textModeStyle = disabled ? styles.disabledText : styles[`${variant}Text` as keyof typeof styles];
  const sizeStyle = styles[size];
  const textSizeStyle = textSizeStyles[size];

  return (
    <TouchableOpacity testID={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} activeOpacity={disabled ? 1 : 0.6} onPress={onPress}>
      <View style={[styles.button, modeStyle, sizeStyle, style]} >
        <Text style={[textStyles.buttonLabel, textModeStyle, textSizeStyle]}>{label}</Text>
        {action === "add" && <Plus style={styles.actionItem} />}
        {action === "right arrow" && <RightArrow style={styles.actionItem} />}
        {action === "location" && <MapPin style={styles.actionItem} stroke={colours.light} strokeWidth={2} />}
      </View>
    </TouchableOpacity>
  );
};

export const ButtonGroup = ({
  variant = 'dark',
  labels,
  actions,
  disabled,
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
          action={typeof actions === "string" ? actions : actions?.[index]}
          variant={buttonVariant(index)}
          disabled={disabled?.[index]}
          onPress={onPress[index]}
        />
      ))}
    </View>
  )
}

export interface BackButtonProps {
  navigation: { goBack: () => void };
}

export const BackButton = ({
  navigation
}: BackButtonProps) => {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.backButton} onPress={() => navigation.goBack()}>
      <Text style={styles.backButtonText}>{'←'}</Text>
    </TouchableOpacity>
  );
}

export const InlineButton = ({
  label,
  onPress
}: ButtonProps) => {
  return (
    <TouchableOpacity testID={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} >
      <Text style={styles.inlineButtonText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 48,
    width: "100%",
    minWidth: '100%',
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
  disabled: {
    backgroundColor: colours.inputBackground,
    borderColor: colours.buttonBorder,
  },
  disabledText: {
    color: colours.placeholderText,
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
  actionItem: {
    position: 'absolute',
    right: 16
  },
  buttonGroup: {
    gap: 16
  },
  backButton: {
    justifyContent: "flex-start",
  },
  backButtonText: {
    color: colours.light,
    fontSize: fonts.size.xl
  },
  inlineButtonText: {
    ...textStyles.subtitle,
    color: colours.light,
  }
});

const textSizeStyles = {
  medium: styles.mediumText,
  large: styles.largeText,
};
