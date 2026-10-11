import { colours } from "@theme/colours";
import { fonts, textStyles } from "@theme/fonts";
import { StyleSheet, Text, TextInput, View } from "react-native";

export interface CodeInputProps {
    value?: string;
    placeholder?: string;
    testID?: string;
    error?: string | null;
    onChangeText?: (text: string) => void
}

export const CodeInput = ({
    value,
    placeholder,
    testID,
    error,
    onChangeText }
    : CodeInputProps) => {

    return (
        <View>
            <TextInput
                testID={testID}
                accessibilityLabel={testID}
                accessibilityHint={error ?? undefined}
                style={[styles.codeInput, !!error && styles.codeInputError]}
                placeholder={placeholder}
                placeholderTextColor={colours.placeholderText}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={6}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );

}

export const styles = StyleSheet.create({
    codeInput: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.xxl,
        backgroundColor: colours.inputBackground,
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        color: colours.light,
        includeFontPadding: false,
        textAlignVertical: "center",
        borderWidth: 1,
        borderColor: "transparent",
    },
    codeInputError: {
        borderColor: colours.red,
    },
    errorText: {
        ...textStyles.inputText,
        fontSize: fonts.size.sm,
        color: colours.red,
        paddingTop: 6,
        textAlign: "left",
    }
})