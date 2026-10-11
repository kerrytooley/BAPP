import { Platform, StyleProp, StyleSheet, ViewStyle, View, Text, TouchableOpacity } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { fonts, textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { formatDate } from "@utils/dateTimeUtils";

export interface DatePickerInputProps {
    fieldLabel: string;
    value?: Date;
    onChange?: (date: Date) => void;
    onOpen?: () => void;
    style?: StyleProp<ViewStyle>;
    error?: string | null;
    minimumDate?: Date;
}

export const DatePickerInput = ({
    fieldLabel,
    value,
    onChange,
    onOpen,
    style,
    error,
    minimumDate,
}: DatePickerInputProps) => {
    const [show, setShow] = useState(false);

    const toggleShow = () => {
        const next = !show;
        setShow(next);
        if (next) {
            onOpen?.();
            if (!value) onChange?.(new Date());
        }
    };

    const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
        // Android shows a one-shot dialog that re-opens on every render while mounted.
        if (event.type === 'dismissed' || Platform.OS === 'android') setShow(false);
        if (event.type === 'dismissed') return;
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
            <TouchableOpacity style={[styles.inputBox, !!error && styles.inputBoxError]} onPress={toggleShow} activeOpacity={0.7} accessibilityHint={error ?? undefined}>
                <Text style={[styles.inputText, !value && styles.placeholder]}>
                    {displayValue}
                </Text>
            </TouchableOpacity>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {show && (
                <DateTimePicker
                    value={value ?? new Date()}
                    mode="date"
                    display="spinner"
                    minimumDate={minimumDate}
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
    inputBoxError: {
        borderColor: colours.red,
    },
    errorText: {
        ...textStyles.inputText,
        fontSize: fonts.size.sm,
        color: colours.red,
        paddingTop: 6,
    },
});
