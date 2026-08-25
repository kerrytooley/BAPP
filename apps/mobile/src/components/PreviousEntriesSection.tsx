import { Observation } from "@bapp/domain";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { screen } from "@theme/screen";
import { Text, View, StyleSheet, ScrollView } from "react-native";
import { ObservationTile } from "./ObservationTile";

interface PreviousEntriesInterface {
    observations: Observation[]
    onAddHeard: (observation: Observation) => void
    onAddSeen: (observation: Observation) => void
    onEdit: (observationId: string) => void
}

export const PreviousEntriesSection = ({ observations, onAddHeard, onAddSeen, onEdit }: PreviousEntriesInterface) => {

    const inverseObservations = [...observations].reverse();
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Previous entries:</Text>
            <View style={styles.dividerLine} />
            <View style={styles.observations}>
                <ScrollView style={screen.scroll} contentContainerStyle={screen.scrollContent} keyboardShouldPersistTaps="handled">
                    {(!observations || observations.length < 1) &&
                        <Text style={styles.placeholderText}>Add a bat entry to see it here</Text>
                    }
                    {inverseObservations.map((observation) => (
                        <ObservationTile
                            key={observation.id}
                            observation={observation}
                            onAddHeard={() => onAddHeard(observation)}
                            onAddSeen={() => onAddSeen(observation)}
                            onEdit={() => onEdit(observation.id)} />
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