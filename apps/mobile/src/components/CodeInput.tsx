import { colours } from "@theme/colours";
import { fonts } from "@theme/fonts";
import { screen } from "@theme/screen";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

export interface CodeInputProps {
    value?: string;
    placeholder?: string;
    onChangeText?: (text: string) => void
}

export const CodeInput = ({
    value,
    placeholder,
    onChangeText }
    : CodeInputProps) => {

    return (
        <View>
            <TextInput
                style={styles.codeInput}
                placeholder={placeholder}
                placeholderTextColor={colours.placeholderText}
                value={value}
                onChangeText={onChangeText}
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