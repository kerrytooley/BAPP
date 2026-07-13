import { colours } from "@theme/colours";
import { fonts } from "@theme/fonts";
import { StyleSheet, TextInput, View } from "react-native";

export interface CodeInputProps {
    value?: string;
    placeholder?: string;
    testID?: string;
    onChangeText?: (text: string) => void
}

export const CodeInput = ({
    value,
    placeholder,
    testID,
    onChangeText }
    : CodeInputProps) => {

    return (
        <View>
            <TextInput
                testID={testID}
                accessibilityLabel={testID}
                style={styles.codeInput}
                placeholder={placeholder}
                placeholderTextColor={colours.placeholderText}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoCorrect={false}
            />
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
    }
})