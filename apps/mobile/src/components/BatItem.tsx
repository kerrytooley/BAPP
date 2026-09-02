import { Image, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ChevronRight from "@assets/icons/chevronRight.svg"
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { LinearGradient } from "expo-linear-gradient";
import InfoTooltip from "@assets/icons/info.svg";
import { useState } from "react";

export interface Bat {
    id: string,
    image: ImageSourcePropType,
    species: string,
    abr: string,
    group: "Pipistrelle" | "Myotis" | "Long-eared" | "Nyctalus" | "Horseshoe" | "Other",
    frequencyRange: string,
    info: string
}

export interface BatItemProps {
    bat: Bat,
    onPress: () => void
}

export const BatItem = ({ bat, onPress }: BatItemProps) => {
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

    return (
        <TouchableOpacity onPress={onPress} accessibilityRole="button" testID={bat.species} accessibilityLabel={bat.species} style={styles.container}>
            <View style={styles.batItem}>
                <Image source={bat.image} style={styles.batImage} />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Bat Info" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.infoTooltip} onPress={() => setIsFullScreen(true)}>
                    <InfoTooltip width={20} />
                </TouchableOpacity>
                <Modal
                    visible={isFullScreen}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsFullScreen(false)}
                >
                    <Pressable testID="bat-info-backdrop" style={styles.infoBackdrop} onPress={() => setIsFullScreen(false)}>
                        <Pressable style={styles.infoModal} onPress={() => { }}>
                            <Text style={styles.infoTitle}>{bat.species}</Text>
                            <Text style={styles.infoFrequency}>{bat.frequencyRange}</Text>
                            <Text style={styles.infoText}>{bat.info}</Text>
                        </Pressable>
                    </Pressable>
                </Modal>
                <LinearGradient
                    colors={["transparent", colours.cardbackground]}
                    style={styles.gradient}
                />
                <View style={styles.labelContainer}>
                    <Text style={styles.speciesLabel}>{bat.species}</Text>
                    <View style={styles.labelRow} >
                        <Text style={styles.frequencyLabel}>{bat.frequencyRange}</Text>
                        <ChevronRight />
                    </View>
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
    labelContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        gap: 4,
    },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    speciesLabel: {
        ...textStyles.buttonLabel,
        textAlign: "left",
        color: colours.light,
    },
    frequencyLabel: {
        ...textStyles.buttonLabel,
        textAlign: "left",
        color: colours.placeholderText,
    },
    infoTooltip: {
        position: 'absolute',
        top: 8,
        right: 16
    },
    infoBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    infoModal: {
        width: "100%",
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        padding: 24,
        gap: 8,
    },
    infoTitle: {
        ...textStyles.title,
        textAlign: "left",
    },
    infoFrequency: {
        ...textStyles.subtitle,
        textAlign: "left",
        color: colours.placeholderText,
    },
    infoText: {
        ...textStyles.subtitle,
        textAlign: "left",
    }

})