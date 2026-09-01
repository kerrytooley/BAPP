import { StyleSheet, View } from "react-native";
import { BatItem, Bat } from "./BatItem";
import { Button } from "./Button";

export interface BatGridProps {
    bats: Array<Bat>,
    onPress: (species: string) => void;
}
const groups = ["Pipistrelle", "Myotis", "Long-eared", "Nyctalus", "Horseshoe", "Other"]
export const BatGrid = ({ bats, onPress }: BatGridProps) => {
    return (
        groups.map((group) => (
            <View key={group}>
                <Button label={group} onPress={() => onPress(group)} />
                <View style={styles.grid}>
                    {bats
                        .filter((bat) => bat.group === group)
                        .map((bat) => (
                            <View key={bat.id} style={styles.cell}>
                                <BatItem
                                    bat={bat}
                                    onPress={() => onPress(bat.species)}
                                />
                            </View>
                        ))}
                </View>
            </View>
        ))
    )
}

const styles = StyleSheet.create({
    grid: {
        paddingVertical: 16,
        rowGap: 16,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    cell: {
        width: "48%"
    }
})