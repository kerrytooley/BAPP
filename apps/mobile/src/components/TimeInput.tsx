import { StyleProp, StyleSheet, ViewStyle, View, Text, TextInput } from "react-native";
import { textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';

export interface TimeInputProps {
    fieldLabel: string;
    value?: string;
    onChangeText?: (text: string) => void;
    style?: StyleProp<ViewStyle>;
}

export const TimeInput = ({
    fieldLabel,
    value,
    onChangeText,
    style
}: TimeInputProps) => {

    return (
        <View style={[styles.timeInputField, style]}>
            <View style={styles.inputTitle}>
                <Text style={styles.inputTitleText}>{fieldLabel}</Text>
            </View>
            <View style={styles.inputRow}>
                <View style={styles.inputBox}>
                    <TextInput
                        style={styles.inputText}
                        value={value !== undefined ? (value.split(':')[0] ?? '') : undefined}
                        onChangeText={onChangeText ? (hh) => onChangeText(`${hh}:${(value ?? '').split(':')[1] ?? ''}`) : undefined}
                        placeholder={'HH'}
                        placeholderTextColor={colours.placeholderText}
                    />
                </View>
                <Text style={{ color: colours.light }}>:</Text>
                <View style={styles.inputBox}>
                    <TextInput
                        style={styles.inputText}
                        value={value !== undefined ? (value.split(':')[1] ?? '') : undefined}
                        onChangeText={onChangeText ? (mm) => onChangeText(`${(value ?? '').split(':')[0] ?? ''}:${mm}`) : undefined}
                        placeholder={'MM'}
                        placeholderTextColor={colours.placeholderText}
                    />
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    timeInputField: {
        width: "100%",
        minWidth: 360,
        paddingTop: 8,
        alignItems: "flex-start",
    },
    inputRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        alignItems: "center",
        gap: 16
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
        justifyContent: "center",
        gap: 20,
        flexDirection: "row",
        width: "100%",
        flex: 1
    },
    inputText: {
        ...textStyles.dateTimeInputText,
        color: colours.light,
        flex: 1,

    },
    topAlign: {
        alignItems: 'flex-start',
    }
})