import { colours } from "@theme/colours"
import { fonts, textStyles } from "@theme/fonts"
import { formatTime } from "@utils/dateTimeUtils"
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useState } from "react"
import { Card } from "../Common/Card"
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface TimeOfObservationProp {
    observationTime: Date,
    onChange: (value: Date) => void,
    label?: string
    error?: string | null
}

export function TimeOfObservation({ observationTime, onChange, label = "Time", error }: TimeOfObservationProp) {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS === 'android') {
            // Close straight away: the Android dialog re-opens on any render while mounted.
            setIsOpen(false);
        } else {
            setTimeout(() => {
                setIsOpen(false);
            }, 150);
        }
        if (event.type === 'dismissed') return;
        if (selected) onChange?.(selected);
    };

    return (
        <Card cardLabel={label} >
            <View style={styles.displayRow}>
                <Text style={styles.text}>{formatTime(observationTime)}</Text>
                <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
                    <Text style={textStyles.placeholderText}>Edit</Text>
                </TouchableOpacity>
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {
                isOpen &&
                <DateTimePicker
                    value={observationTime}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={handleChange}
                    themeVariant="dark"
                />
            }

        </Card>
    )
}

const styles = StyleSheet.create({

    displayRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    text: {
        ...textStyles.buttonLabel,
        color: colours.light
    },
    errorText: {
        ...textStyles.inputText,
        fontSize: fonts.size.sm,
        color: colours.red,
        paddingTop: 6,
    }
})