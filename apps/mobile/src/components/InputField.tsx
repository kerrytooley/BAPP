import { StyleProp, StyleSheet, ViewStyle, View, Text, TextInput } from "react-native";

export interface InputFieldProps {
    variant?: 'primary' | 'unit';
    size?: 'standard' | 'large';
    fieldLabel: string;
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
            <View style={styles.inputTitle}>
                <Text style={styles.inputTitleText}>{fieldLabel}</Text>
            </View>
            <View style={[styles.inputBox, isLarge && styles.large, isLarge && styles.topAlign]}>
                <TextInput
                    style={[styles.inputText, isLarge && styles.inputTextLarge]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholderText}
                    placeholderTextColor="#808080"
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
        flex: 1,
        width: "100%",
        minWidth: 360,
        paddingTop: 8,
        alignItems: "flex-start"
    },
    inputTitle: {
        paddingVertical: 8,
        flexDirection: "row",
        alignSelf: "flex-start",
        alignItems: "flex-start"
    },
    inputTitleText: {
        fontSize: 14,
        letterSpacing: 0.6,
        lineHeight: 24,
        textTransform: "uppercase",
        fontWeight: "600",
        fontFamily: "OpenSans-SemiBold",
        color: "#bfbfbf",
        textAlign: "left"
    },
    inputBox: {
        alignSelf: "stretch",
        borderRadius: 16,
        backgroundColor: "#2c2c2e",
        borderStyle: "solid",
        borderColor: "#808080",
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexDirection: "row"
    },
    inputText: {
        color: "#FFF",
        flex: 1,
        fontSize: 16
    },
    unit: {
        fontSize: 16,
        fontFamily: "OpenSans-SemiBold",
        fontWeight: "600",
        color: "#fff"
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