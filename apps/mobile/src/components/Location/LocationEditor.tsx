import { StyleSheet, Text, View } from "react-native";
import { PressablePinLayer } from "./PressablePinLayer";
import { textStyles } from "@theme/fonts";
import { BoundaryPosition } from "@bapp/domain";

export interface LocationEditorProps {
    boundaryImageUri: string | null | undefined,
    position: BoundaryPosition | null | undefined,
    setPosition: (position: BoundaryPosition) => void
}

export const LocationEditor = ({ boundaryImageUri, position, setPosition }: LocationEditorProps) => {

    return (
        <View style={styles.imageBlock}>
            <View style={styles.imageContainer}>
                {boundaryImageUri &&
                    <PressablePinLayer
                        imageUri={boundaryImageUri}
                        value={position || null}
                        onChange={setPosition}
                        footer={
                            // Always mounted (just hidden) so the image doesn't resize when the first pin drops.
                            <Text
                                style={[styles.hint, !position && styles.hidden]}
                                accessibilityElementsHidden={!position}
                                importantForAccessibility={position ? "auto" : "no-hide-descendants"}
                            >
                                Tap again to move pin
                            </Text>
                        }
                    />
                }
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    hint: {
        ...textStyles.subtitle,
        textAlign: "center",
    },
    hidden: {
        opacity: 0,
    },
    imageContainer: {
        flex: 1,
        minHeight: 0,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
    },
    imageBlock: {
        flex: 1,
        minHeight: 0,
        width: "100%",
        gap: 8,
    },
});