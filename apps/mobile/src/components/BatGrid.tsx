import { StyleSheet, View } from "react-native";
import { BatItem, Bat } from "./BatItem";

export interface BatGridProps {
    bats: Array<Bat>,
    onPress: (species: string) => void;
}

export const BatGrid = ({ bats, onPress }: BatGridProps) => {
    return (
        <View style={styles.grid}>
            {bats.map(bat => (
                <View key={bat.id} style={styles.cell}>
                    <BatItem bat={bat} onPress={() => onPress(bat.id)} />
                </View>
            ))
            }
        </View>
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