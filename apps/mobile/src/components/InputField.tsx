import { StyleProp, StyleSheet, ViewStyle, View, Text, TextInput } from "react-native";
import { textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';

export interface InputFieldProps {
    variant?: 'primary' | 'unit';
    size?: 'standard' | 'large';
    fieldLabel?: string;
    placeholderText: string;
    value?: string;
    unit?: string;
    onChangeText?: (text: string) => void;
    style?: StyleProp<ViewStyle>;
}

export const InputField = ({
    variant = 'primary',
    size = 'standard',
    fieldLabel,
    placeholderText,
    value,
    unit,
    onChangeText,
    style
}: InputFieldProps) => {

    const isLarge = size === 'large';
    const isUnit = variant === 'unit';

    return (
        <View style={[styles.inputField, style]}>
            {fieldLabel &&
                < View style={styles.inputTitle}>
                    <Text style={styles.inputTitleText}>{fieldLabel}</Text>
                </View>
            }
            <View style={[styles.inputBox, isLarge && styles.large, isLarge && styles.topAlign]}>
                <TextInput
                    style={[styles.inputText, isLarge && styles.inputTextLarge]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholderText}
                    placeholderTextColor={colours.placeholderText}
                    multiline={isLarge}
                    numberOfLines={isLarge ? 4 : 1}
                />
                {isUnit && <Text style={styles.unit}>{unit}</Text>}
            </View>
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
    inputText: {
        ...textStyles.inputText,
        color: colours.light,
        flex: 1,
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