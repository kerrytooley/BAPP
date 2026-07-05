import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colours } from "@theme/colours";

export interface DocumentPreviewProps {
    value: string | undefined | null
}

export const DocumentPreview = ({ value }: DocumentPreviewProps) => {
    return (
        <View style={styles.container}>
            {
                value &&
                <Image source={{ uri: value }} style={styles.preview} />
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
    },
    preview: {
        width: "100%",
        height: "auto",
        borderRadius: 16
    }
});