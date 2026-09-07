import { NotesProps, Observation } from "@bapp/domain";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { screen } from "@theme/screen";
import { Text, View, StyleSheet, ScrollView } from "react-native";
import { ObservationTile } from "./ObservationTile";
import { LocationNote } from "@components/Display/LocationNote";

interface PreviousEntriesInterface {
    observations: Observation[]
    notes?: NotesProps[]
    onAddHeard: (observation: Observation) => void
    onAddSeen: (observation: Observation) => void
    onEdit: (observationId: string) => void
}

type TimedEntry =
    | { time: Date; type: "observation"; value: Observation }
    | { time: Date; type: "note"; value: NotesProps };

export const PreviousEntriesSection = ({ observations = [], notes = [], onAddHeard, onAddSeen, onEdit }: PreviousEntriesInterface) => {

    const timedObservations: TimedEntry[] = observations.map((observation) => ({
        time: observation.firstSeenAt ?? observation.createdAt,
        type: "observation",
        value: observation,
    }));

    const timedNotes: TimedEntry[] = notes.map((note) => ({
        time: note.time,
        type: "note",
        value: note,
    }));

    const allEntries = [...timedObservations, ...timedNotes].sort(
        (a, b) => b.time.getTime() - a.time.getTime()
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Previous entries:</Text>
            <View style={styles.dividerLine} />
            <View style={styles.observations}>
                <ScrollView style={screen.scroll} contentContainerStyle={screen.scrollContent} keyboardShouldPersistTaps="handled">
                    {(!observations || observations.length < 1) &&
                        <Text style={styles.placeholderText}>Add a bat entry to see it here</Text>
                    }
                    {allEntries.map((entry) => (
                        entry.type === "note"
                            ? <LocationNote key={`note-${entry.time.getTime()}`} note={entry.value} onEdit={() => { }} />
                            : <ObservationTile
                                key={entry.value.id}
                                observation={entry.value}
                                onAddHeard={() => onAddHeard(entry.value)}
                                onAddSeen={() => onAddSeen(entry.value)}
                                onEdit={() => onEdit(entry.value.id)} />
                    ))}
                </ScrollView>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        gap: 8,
        flex: 1
    },
    header: {
        ...textStyles.buttonLabel,
        color: colours.light
    },
    dividerLine: {
        height: 1,
        width: "100%",
        backgroundColor: colours.light,
    },
    observations: {
        gap: 16,
        flex: 1
    },
    placeholderText: {
        ...textStyles.placeholderText,
        paddingVertical: 24
    }
})