import { StyleProp, StyleSheet, ViewStyle, View, Text, TouchableOpacity, TextInput } from "react-native";

export interface InputFieldProps {
    variant?: 'primary' | 'unit';
    size?: 'standard' | 'large';
    fieldLabel: string;
    placeholderText: string;
    value?: string;
    onChangeText?: (text: string) => void;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

export const InputField = ({
    variant = 'primary',
    size = 'standard',
    fieldLabel,
    placeholderText,
    value,
    onChangeText,
    onPress,
    style
}: InputFieldProps) => {

    return (
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.6} onPress={onPress}>
            <View style={styles.inputField}>
                <View style={[styles.rowLabel, styles.textFlexBox]}>
                    <Text style={styles.rowLabelText}>{fieldLabel}</Text>
                </View>
                <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholderText}
                    placeholderTextColor="#808080"
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    textFlexBox: {
        flexDirection: "row",
        alignSelf: "flex-start",
        alignItems: "flex-start"
    },
    inputField: {
        flex: 1,
        width: "100%",
        minWidth: 343,
        paddingTop: 8,
        alignItems: "flex-start"
    },
    rowLabel: {
        paddingHorizontal: 0,
        paddingVertical: 8
    },
    rowLabelText: {
        fontSize: 14,
        letterSpacing: 0.6,
        lineHeight: 24,
        textTransform: "uppercase",
        fontWeight: "600",
        fontFamily: "OpenSans-SemiBold",
        color: "#bfbfbf",
        textAlign: "left"
    },
    textInput: {
        alignSelf: "stretch",
        borderRadius: 16,
        backgroundColor: "#2c2c2e",
        borderStyle: "solid",
        borderColor: "#808080",
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 15,
        alignItems: "flex-start",
        color: "#FFF"
    },
    inputField2: {
        fontSize: 16,
        lineHeight: 26,
        fontFamily: "OpenSans-Regular",
        color: "#fff",
        opacity: 1,
        textAlign: "left"
    }
})