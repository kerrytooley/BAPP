import { StyleProp, StyleSheet, ViewStyle, View, Text, TouchableOpacity } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";

export interface TimePickerInputProps {
    fieldLabel: string;
    value?: Date;
    onChange?: (time: Date) => void;
    style?: StyleProp<ViewStyle>;
}

export const TimePickerInput = ({
    fieldLabel,
    value,
    onChange,
    style,
}: TimePickerInputProps) => {
    const [show, setShow] = useState(false);

    const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
        setShow(false);
        if (selected) onChange?.(selected);
    };

    const displayValue = value
        ? value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
        : 'HH:MM';

    return (
        <View style={[styles.field, style]}>
            <View style={styles.inputTitle}>
                <Text style={styles.inputTitleText}>{fieldLabel}</Text>
            </View>
            <TouchableOpacity style={styles.inputBox} onPress={() => setShow(true)} activeOpacity={0.7}>
                <Text style={[styles.inputText, !value && styles.placeholder]}>
                    {displayValue}
                </Text>
            </TouchableOpacity>
            {show && (
                <DateTimePicker
                    value={value ?? new Date()}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={handleChange}
                    themeVariant="dark"
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    field: {
        width: '100%',
        minWidth: 360,
        paddingTop: 8,
        alignItems: 'flex-start',
    },
    inputTitle: {
        paddingVertical: 8,
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    inputTitleText: {
        ...textStyles.inputTitleText,
        textTransform: 'uppercase',
        color: colours.inputTitle,
        textAlign: 'left',
    },
    inputBox: {
        alignSelf: 'stretch',
        borderRadius: 16,
        backgroundColor: colours.inputBackground,
        borderStyle: 'solid',
        borderColor: colours.inputBorder,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 15,
    },
    inputText: {
        ...textStyles.dateTimeInputText,
        color: colours.light,
    },
    placeholder: {
        color: colours.placeholderText,
    },
});
