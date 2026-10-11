import { NotesProps } from "@bapp/domain";
import { formatTime } from "@utils/dateTimeUtils";
import { View, Text, StyleSheet } from "react-native";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";

export const NoteSummary = (note: NotesProps) => {
    return (
        <View style={styles.card}>
            <Text style={styles.text}>{formatTime(note.time)}</Text>
            <Text style={styles.text}>{note.text}</Text>
        </View >
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        flexDirection: 'column',
        padding: 16,
        gap: 8,
        width: '100%'
    },
    text: {
        ...textStyles.inputText,
        color: colours.light
    }
})