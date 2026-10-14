import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { Expand } from "@components/Common/Icons";
import { StaticPinLayer, type PinValue } from "../Location/StaticPinLayer";

export interface DocumentPreviewProps {
    imageUri: string | undefined | null,
    values: PinValue[]
    emptyMessage?: string
}

export const DocumentPreview = ({ imageUri, values, emptyMessage }: DocumentPreviewProps) => {
    const [isFullScreen, setIsFullScreen] = useState(false);

    return (
        <View style={styles.container}>
            {imageUri === null && emptyMessage &&
                <Text style={styles.emptyMessage}>{emptyMessage}</Text>
            }
            {imageUri &&
                <>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setIsFullScreen(true)}>
                        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                        <View style={styles.expandBadge}>
                            <Expand width={16} height={16} stroke={colours.light} />
                        </View>
                    </TouchableOpacity>
                    <Modal
                        visible={isFullScreen}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setIsFullScreen(false)}
                    >
                        <Pressable style={styles.fullScreenBackdrop} onPress={() => setIsFullScreen(false)}>
                            <StaticPinLayer imageUri={imageUri} values={values} style={styles.fullScreenImage} />
                        </Pressable>
                    </Modal>
                </>
            }
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: 80,
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        justifyContent: "center",
        overflow: "hidden",
    },
    preview: {
        width: "100%",
        height: 80,
        borderRadius: 16
    },
    expandBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    fullScreenBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    fullScreenImage: {
        maxHeight: "80%",
    },
    emptyMessage: {
        ...textStyles.inputText,
        color: colours.placeholderText,
        textAlign: "center",
        paddingHorizontal: 16,
    }
});