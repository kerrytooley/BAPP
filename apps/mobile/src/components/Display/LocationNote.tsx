import { colours } from "@theme/colours";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fonts, textStyles } from "@theme/fonts";
import { NotesProps } from "@bapp/domain";
import { formatTime } from "@utils/dateTimeUtils";

interface LocationNoteProps {
    note: NotesProps,
    onEdit: () => void
}

export const LocationNote = ({ note, onEdit }: LocationNoteProps) => {

    return (
        <View style={styles.tile}>

            <View style={styles.row}>
                <Text style={styles.text}>Note: </Text>
                <View style={{ flexDirection: "row", gap: 16 }}>
                    <Text style={styles.text}>{formatTime(note.time)}</Text>
                    <View>
                        <TouchableOpacity onPress={() => onEdit()}>
                            <Text style={[styles.text, { color: colours.placeholderText }]}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <Text style={styles.text}>{note.text}</Text>


        </View>
    )
}

const styles = StyleSheet.create({
    tile: {
        width: "100%",
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        padding: 16,
        paddingHorizontal: 24,
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%"
    },
    text: {
        ...textStyles.inputText,
        color: colours.light,
        fontSize: fonts.size.sm,
    },
    buttonGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8
    }
})