import { Observation } from "@bapp/domain";
import { formatTime } from "@utils/dateTimeUtils";
import { View, Text, StyleSheet } from "react-native";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";


export const ObservationSummary = (observation: Observation) => {
    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.header}>{observation.species}</Text>
            </View>
            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={styles.cell}><Text style={styles.text}>First seen: </Text><Text style={styles.text}>{formatTime(observation.firstSeenAt)}</Text></View>
                    <View style={styles.cell}><Text style={styles.text}>Emergence: </Text><Text style={styles.text}>{observation.emergence ? 'Yes' : 'No'}</Text></View>
                    <View style={styles.cell}><Text style={styles.text}>Seen count: </Text><Text style={styles.text}>{observation.seenCount}</Text></View>
                    <View style={styles.cell}><Text style={styles.text}>Direction: </Text><Text style={styles.text}>{observation.direction ?? 'N/A'}</Text></View>
                </View>
                <View style={styles.column}>
                    <View style={styles.cell}><Text style={styles.text}>Last seen: </Text><Text style={styles.text}>{formatTime(observation.lastSeenAt)}</Text></View>
                    <View style={styles.cell}><Text style={styles.text}>Frequency: </Text><Text style={styles.text}>{observation.frequency ?? 'N/A'}</Text></View>
                    <View style={styles.cell}><Text style={styles.text}>Heard count: </Text><Text style={styles.text}>{observation.heardCount}</Text></View>
                    <View style={styles.cell}><Text style={styles.text}>Flight paths: </Text><Text style={styles.text}>{observation.flightPaths.length > 0 ? 'Yes' : 'No'}</Text></View>
                </View>
            </View>

            <Text style={styles.text}>Notes: {observation.notes ?? 'N/A'}</Text>
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 24
    },
    cell: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignSelf: 'stretch'
    },
    column: {
        flex: 1,
        flexDirection: 'column',
        gap: 4
    },
    header: {
        ...textStyles.buttonLabel,
        color: colours.light
    },
    text: {
        ...textStyles.inputText,
        color: colours.light
    }
})