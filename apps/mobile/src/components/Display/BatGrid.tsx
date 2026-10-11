import { StyleSheet, View } from "react-native";
import { BatItem, Bat } from "./BatItem";
import { Button } from "../Common/Button";

export interface BatGridProps {
    bats: Array<Bat>,
    onPress: (species: string) => void;
    isLoading: boolean;
}
const groups = ["Pipistrelle", "Myotis", "Long-eared", "Nyctalus", "Horseshoe", "Other"]
export const BatGrid = ({ bats, onPress, isLoading }: BatGridProps) => {
    return (
        <View>
            {
                groups.map((group) => (

                    <View key={group} >
                        <Button disabled={isLoading} label={group} onPress={() => onPress(group)} action="right arrow" />
                        <View key={group} style={styles.grid}>
                            {bats
                                .filter((bat) => bat.group === group)
                                .map((bat) => (
                                    <View key={bat.id} style={styles.cell}>
                                        <BatItem
                                            bat={bat}
                                            onPress={() => onPress(bat.species)}
                                            disabled={isLoading}
                                        />
                                    </View>
                                ))}
                        </View>

                    </View>
                ))}
            <Button disabled={isLoading} label="Unknown" variant="dark" action="right arrow" onPress={() => onPress("Unknown")} />
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
        width: "48%",
    }
})