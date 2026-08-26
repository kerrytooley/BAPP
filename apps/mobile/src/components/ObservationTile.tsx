import { Observation } from "@bapp/domain";
import { colours } from "@theme/colours";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { bats } from "../data/bats";
import { formatTime } from "@utils/dateTimeUtils";
import PlusButton from "@assets/icons/plusButton.svg"
import { fonts, textStyles } from "@theme/fonts";

interface ObservationTileProps {
    observation: Observation,
    onAddSeen: () => void,
    onAddHeard: () => void,
    onEdit: () => void
}

export const ObservationTile = ({ observation, onAddSeen, onAddHeard, onEdit }: ObservationTileProps) => {

    function getSpeciesAbbreviation(observation: Observation) {
        return bats.find((bat) => bat.species == observation.species)?.abr;
    }

    return (
        <View style={styles.tile}>
            <Text style={styles.titleText}>{getSpeciesAbbreviation(observation)}</Text>
            <Text style={styles.text}>{formatTime(observation.firstSeenAt)}</Text>
            <View style={styles.buttonGroup}>
                <Text style={styles.text}>S ({observation.seenCount})</Text>
                <TouchableOpacity accessibilityLabel="Add seen count" onPress={() => onAddSeen()}>
                    <PlusButton width={24} />
                </TouchableOpacity>
            </View>
            <View style={styles.buttonGroup}>
                <Text style={styles.text}>H ({observation.heardCount})</Text>
                <TouchableOpacity accessibilityLabel="Add heard count" onPress={() => onAddHeard()}>
                    <PlusButton width={24} />
                </TouchableOpacity>
            </View>
            <View >
                <TouchableOpacity onPress={() => onEdit()}>
                    <Text style={[styles.text, { color: colours.placeholderText }]}>Edit</Text>
                </TouchableOpacity>
            </View>
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
        flexDirection: "row",
        alignItems: "center",
        gap: 18
    },
    titleText: {
        ...textStyles.inputTitleText,
        color: colours.light,
        fontSize: fonts.size.sm,
        flex: 1
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