import { colours } from "@theme/colours"
import { textStyles } from "@theme/fonts"
import { formatTime } from "@utils/dateTimeUtils"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useState } from "react"
import { Card } from "./Card"
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface TimeOfObservationProp {
    observationTime: Date,
    onChange: (value: Date) => void
}

export function TimeOfObservation({ observationTime, onChange }: TimeOfObservationProp) {
    const [isOpen, setIsOpen] = useState<Boolean>(false);

    const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
        setTimeout(() => {
            setIsOpen(false);
        }, 150);
        if (selected) onChange?.(selected);
    };

    return (
        <Card cardLabel="Time" >
            <View style={styles.displayRow}>
                <Text style={styles.text}>{formatTime(observationTime)}</Text>
                <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
                    <Text style={textStyles.placeholderText}>Edit</Text>
                </TouchableOpacity>
            </View>
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
    }
})