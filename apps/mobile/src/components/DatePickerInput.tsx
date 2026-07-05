import { StyleProp, StyleSheet, ViewStyle, View, Text, TouchableOpacity } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { formatDate } from "@utils/dateTimeUtils";

export interface DatePickerInputProps {
    fieldLabel: string;
    value?: Date;
    onChange?: (date: Date) => void;
    onOpen?: () => void;
    style?: StyleProp<ViewStyle>;
}

export const DatePickerInput = ({
    fieldLabel,
    value,
    onChange,
    onOpen,
    style,
}: DatePickerInputProps) => {
    const [show, setShow] = useState(false);

    const toggleShow = () => {
        setShow((prev) => {
            const next = !prev;
            if (next) onOpen?.();
            return next;
        });
    };

    const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === 'dismissed') {
            setShow(false);
            return;
        }
        if (selected) onChange?.(selected);
    };

    const displayValue = value
        ? formatDate(value)
        : 'DD/MM/YYYY';

    return (
        <View style={[styles.field, style]}>
            <View style={styles.inputTitle}>
                <Text style={styles.inputTitleText}>{fieldLabel}</Text>
            </View>
            <TouchableOpacity style={styles.inputBox} onPress={toggleShow} activeOpacity={0.7}>
                <Text style={[styles.inputText, !value && styles.placeholder]}>
                    {displayValue}
                </Text>
            </TouchableOpacity>
            {show && (
                <DateTimePicker
                    value={value ?? new Date()}
                    mode="date"
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
