import { KeyboardTypeOptions, StyleProp, StyleSheet, TextInputProps, ViewStyle, View, Text, TextInput } from "react-native";
import { useState } from 'react';
import { fonts, textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';

export interface InputFieldProps {
    variant?: 'primary' | 'unit';
    size?: 'standard' | 'large';
    fieldLabel?: string;
    placeholderText: string;
    value?: string;
    unit?: string;
    testID?: string;
    error?: string | null;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: TextInputProps['autoCapitalize'];
    onChangeText?: (text: string) => void;
    onEndEditing?: () => void;
    onFocus?: () => void;
    style?: StyleProp<ViewStyle>;
}

export const InputField = ({
    variant = 'primary',
    size = 'standard',
    fieldLabel,
    placeholderText,
    value,
    unit,
    testID,
    error,
    keyboardType,
    autoCapitalize,
    onChangeText,
    onEndEditing,
    onFocus,
    style
}: InputFieldProps) => {

    const isLarge = size === 'large';
    const isUnit = variant === 'unit';
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.inputField, style]}>
            {fieldLabel &&
                < View style={styles.inputTitle}>
                    <Text style={styles.inputTitleText}>{fieldLabel}</Text>
                </View>
            }
            <View style={[styles.inputBox, isFocused && styles.inputBoxFocused, !!error && styles.inputBoxError, isLarge && styles.large, isLarge && styles.topAlign]}>
                <TextInput
                    testID={testID}
                    accessibilityLabel={testID}
                    accessibilityHint={error ?? undefined}
                    style={[styles.inputText, isLarge && styles.inputTextLarge]}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => {
                        onFocus?.()
                        setIsFocused(true)
                    }}
                    onBlur={() => setIsFocused(false)}
                    onEndEditing={onEndEditing}
                    placeholder={placeholderText}
                    placeholderTextColor={colours.placeholderText}
                    multiline={isLarge}
                    numberOfLines={isLarge ? 4 : 1}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                />
                {isUnit && <Text style={styles.unit}>{unit}</Text>}
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    inputField: {
        width: "100%",
        alignItems: "flex-start"
    },
    inputTitle: {
        paddingVertical: 8,
        flexDirection: "row",
        alignSelf: "flex-start",
        alignItems: "flex-start"
    },
    inputTitleText: {
        ...textStyles.inputTitleText,
        textTransform: "uppercase",
        color: colours.inputTitle,
        textAlign: "left"
    },
    inputBox: {
        alignSelf: "stretch",
        borderRadius: 16,
        backgroundColor: colours.inputBackground,
        borderStyle: "solid",
        borderColor: colours.inputBorder,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexDirection: "row"
    },
    inputBoxFocused: {
        borderColor: colours.light,
    },
    inputBoxError: {
        borderColor: colours.red,
    },
    errorText: {
        ...textStyles.inputText,
        fontSize: fonts.size.sm,
        color: colours.red,
        paddingTop: 6,
        textAlign: "left",
    },
    inputText: {
        ...textStyles.inputText,
        color: colours.light,
        flex: 1,
        paddingVertical: 0,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    unit: {
        ...textStyles.unit,
        color: colours.light,
    },
    large: {
        minHeight: 80
    },
    topAlign: {
        alignItems: 'flex-start',
    },
    inputTextLarge: {
        textAlignVertical: 'top',
    },
})