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
                    />
                }
            </View>
            {position && <Text style={textStyles.subtitle}>Tap again to move pin</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    imageContainer: {
        width: "100%",
        borderRadius: 16,
    },
    imageBlock: {
        width: "100%",
        gap: 8,
    },
});