import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ChevronRight from "@assets/icons/chevronRight.svg"
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { LinearGradient } from "expo-linear-gradient";

export interface Bat {
    id: string,
    image: ImageSourcePropType,
    species: string;
}

export interface BatItemProps {
    bat: Bat,
    onPress: () => void
}

export const BatItem = ({ bat, onPress }: BatItemProps) => {
    return (
        <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={bat.species} style={styles.container}>
            <View style={styles.batItem}>
                <Image source={bat.image} style={styles.batImage} />
                <LinearGradient
                    colors={["transparent", colours.cardbackground]}
                    style={styles.gradient}
                />
                <View style={styles.labelRow} >
                    <Text style={styles.speciesLabel}>{bat.species}</Text>
                    <ChevronRight />
                </View>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    batItem: {
        borderRadius: 16,
        overflow: "hidden",
        aspectRatio: 1,
        width: "100%",
        alignContent: "center",
    },
    batImage: {
        resizeMode: "cover",
        width: "100%",
        height: "100%"
    },
    gradient: {
        height: "50%",
        width: "100%",
        position: "absolute",
        bottom: 0
    },
    labelRow: {
        width: "100%",
        justifyContent: "space-between",
        padding: 16,
        position: "absolute",
        bottom: 0,
        flexDirection: "row",
    },
    speciesLabel: {
        ...textStyles.buttonLabel,
        flex: 1,
        textAlign: "left",
        color: colours.light,
    }

})