import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, Info as InfoTooltip } from "@components/Common/Icons"
import { fonts, textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import BatIcon from "@assets/illustrations/bat.svg"

export interface Bat {
    id: string,
    species: string,
    abr: string,
    group: "Pipistrelle" | "Myotis" | "Long-eared" | "Nyctalus" | "Horseshoe" | "Other",
    frequencyRange: string,
    info: string
}

export interface BatItemProps {
    bat: Bat,
    onPress: () => void
    disabled: boolean
}

export const BatItem = ({ bat, onPress, disabled }: BatItemProps) => {
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

    return (
        <TouchableOpacity disabled={disabled} onPress={onPress} accessibilityRole="button" testID={bat.species} accessibilityLabel={bat.species} style={styles.container}>
            <View style={styles.batItem}>
                <BatIcon width="50%" height="50%" style={styles.batImage} />
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
                    colors={["transparent", colours.dark]}
                    style={styles.gradient}
                />
                <View style={styles.labelContainer}>
                    <Text style={styles.speciesLabel}>{bat.species}</Text>
                    <View style={styles.labelRow} >
                        <Text style={styles.frequencyLabel}>{bat.frequencyRange}</Text>
                    </View>
                    <ChevronRight style={styles.chevron} />
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
        backgroundColor: colours.cardbackground,
        borderWidth: 0.5,
        borderColor: colours.inputBorder
    },
    batImage: {
        alignSelf: "center",
        marginRight: 16,
        marginTop: 16
    },
    gradient: {
        height: "70%",
        width: "100%",
        position: "absolute",
        bottom: 0
    },
    labelContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 8,
        paddingVertical: 16,
        gap: 4,
    },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    chevron: {
        position: "absolute",
        right: 16,
        bottom: 16
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
        fontSize: fonts.size.sm
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
        color: colours.placeholderText
    },
    infoText: {
        ...textStyles.subtitle,
        textAlign: "left",
    }

})