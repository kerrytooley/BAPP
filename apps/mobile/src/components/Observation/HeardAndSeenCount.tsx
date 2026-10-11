import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Card } from "../Common/Card"
import { colours } from "@theme/colours"
import { textStyles } from "@theme/fonts"
import { PlusButton as PlusIcon, MinusButton as MinusIcon } from "@components/Common/Icons"

interface CountProps {
    heardCount: number,
    seenCount: number,
    onChangeHeard: (count: number) => void,
    onChangeSeen: (count: number) => void
}

export const HeardAndSeenCount = ({ heardCount, seenCount, onChangeHeard, onChangeSeen }: CountProps) => {

    const setHeardCount = (heard: number, isAdd: boolean) => {
        onChangeHeard(isAdd ? heard + 1 : Math.max(heard - 1, 0));
    };

    const setSeenCount = (seen: number, isAdd: boolean) => {
        onChangeSeen(isAdd ? seen + 1 : Math.max(seen - 1, 0));
    };

    return (
        <Card contentStyle={styles.card} cardLabel="Count">
            <View style={styles.displayRow} >
                <Text style={styles.text}>Heard</Text>
                <View style={styles.countPill}>
                    <TouchableOpacity hitSlop={16} accessibilityLabel="Decrease heard count" onPress={() => setHeardCount(heardCount, false)}>
                        <MinusIcon width={24} />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{heardCount}</Text>
                    <TouchableOpacity hitSlop={16} accessibilityLabel="Increase heard count" onPress={() => setHeardCount(heardCount, true)}>
                        <PlusIcon width={24} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.displayRow} >
                <Text style={styles.text}>Seen</Text>

                <View style={styles.countPill}>
                    <TouchableOpacity hitSlop={16} accessibilityLabel="Decrease seen count" onPress={() => setSeenCount(seenCount, false)}>
                        <MinusIcon width={24} />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{seenCount}</Text>
                    <TouchableOpacity hitSlop={16} accessibilityLabel="Increase seen count" onPress={() => setSeenCount(seenCount, true)}>
                        <PlusIcon width={24} />
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