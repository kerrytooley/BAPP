import { getAspectRatio } from "@utils/image";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

interface ImageCardProps {
    imageUri: string
}

export const ImageCard = ({
    imageUri
}: ImageCardProps) => {
    const [aspectRatio, setAspectRatio] = useState<number>(0.5);

    useEffect(() => {
        if (!imageUri) return
        let cancelled = false
        getAspectRatio(imageUri)
            .then((ratio) => {
                if (!cancelled) setAspectRatio(ratio)
            })
            .catch((e) => console.error("Error getting image aspect ratio", e))
        return () => {
            cancelled = true
        }
    }, [imageUri])

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