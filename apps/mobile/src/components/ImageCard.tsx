import { getAspectRatio } from "@utils/image";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

interface ImageCardProps {
    imageUri: string
}

export const ImageCard = ({
    imageUri
}: ImageCardProps) => {
    const [aspectRatio, setAspectRatio] = useState<number>(0.5);
    imageUri && getAspectRatio(imageUri).then((ratio) => setAspectRatio(ratio))

    return (
        <View style={[styles.layer, { aspectRatio }]}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        </View>
    );
}

const styles = StyleSheet.create({
    layer: {
        width: "100%",
        borderRadius: 16,
        overflow: "hidden"
    },
    image: {
        width: "100%",
        height: "100%"
    }
})