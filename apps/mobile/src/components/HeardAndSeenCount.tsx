import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Card } from "./Card"
import { colours } from "@theme/colours"
import { textStyles } from "@theme/fonts"
import PlusIcon from "@assets/icons/plusButton.svg"
import MinusIcon from "@assets/icons/minusButton.svg"

interface CountProps {
    heardCount: number,
    seenCount: number,
    onChangeHeard: (count: number) => void,
    onChangeSeen: (count: number) => void
}

export const HeardAndSeenCount = ({ heardCount, seenCount, onChangeHeard, onChangeSeen }: CountProps) => {

    const setHeardCount = (heard: number, isAdd: boolean) => {
        if (isAdd) {
            onChangeHeard(heard + 1)
        } else {
            onChangeHeard(heard - 1)
        }
    }

    const setSeenCount = (seen: number, isAdd: boolean) => {
        if (isAdd) {
            onChangeSeen(seen + 1)
        } else {
            onChangeSeen(seen - 1)
        }
    }

    return (
        <Card contentStyle={styles.card} cardLabel="Count">
            <View style={styles.displayRow} >
                <Text style={styles.text}>Heard</Text>
                <View style={styles.countPill}>
                    <TouchableOpacity accessibilityLabel="Decrease heard count" onPress={() => setHeardCount(heardCount, false)}>
                        <MinusIcon width={20} />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{heardCount}</Text>
                    <TouchableOpacity accessibilityLabel="Increase heard count" onPress={() => setHeardCount(heardCount, true)}>
                        <PlusIcon width={20} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.displayRow} >
                <Text style={styles.text}>Seen</Text>

                <View style={styles.countPill}>
                    <TouchableOpacity accessibilityLabel="Decrease seen count" onPress={() => setSeenCount(seenCount, false)}>
                        <MinusIcon width={20} />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{seenCount}</Text>
                    <TouchableOpacity accessibilityLabel="Increase seen count" onPress={() => setSeenCount(seenCount, true)}>
                        <PlusIcon width={20} />
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    card: {
        gap: 16
    },
    displayRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    dividerLine: {
        height: 1,
        width: "100%",
        borderWidth: 1,
        borderColor: colours.placeholderText
    },
    countPill: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 24,
        backgroundColor: colours.inputBackground,
        gap: 16,
        alignItems: "center",
    },
    text: {
        ...textStyles.inputText,
        color: colours.light
    },
    countText: {
        ...textStyles.buttonLabel,
        color: colours.light,
    }
})