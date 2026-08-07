import { BoundaryPosition } from "@bapp/domain"
import { LayoutChangeEvent, View } from "react-native"
import { useEffect, useState } from "react"
import { Image, StyleSheet } from "react-native"
import MapPin from "@assets/icons/mapPin.svg"
import { colours } from "@theme/colours"
import { getAspectRatio } from "@utils/image"

interface StaticPinLayerProps {
    imageUri: string
    value: BoundaryPosition | null | undefined
}

const PIN_WIDTH = 24;
const PIN_HEIGHT = 24;

export const StaticPinLayer = ({ imageUri, value }: StaticPinLayerProps) => {
    const [layout, setLayout] = useState({ width: 0, height: 0 });
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

    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout
        setLayout({ width, height })
    }

    return (
        <View onLayout={onLayout} style={[styles.layer, { aspectRatio }]}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

            {value && layout.width > 0 && (
                <View
                    pointerEvents="none"
                    style={[
                        styles.pin,
                        {
                            left: value.x * layout.width - PIN_WIDTH / 2,
                            top: value.y * layout.height - PIN_HEIGHT
                        }
                    ]}
                >
                    <MapPin width={PIN_WIDTH} height={PIN_HEIGHT} stroke={colours.red} strokeWidth={2} />
                </View>
            )}
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
    },
    pin: {
        position: "absolute",
        width: PIN_WIDTH,
        height: PIN_HEIGHT
    },
    container: {
        width: "100%",
        height: "60%",
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        justifyContent: "center",
    },
    preview: {
        width: "100%",
        height: "100%",
        borderRadius: 16
    },
})