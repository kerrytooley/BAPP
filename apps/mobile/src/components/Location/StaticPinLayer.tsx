import { BoundaryPosition } from "@bapp/domain"
import { LayoutChangeEvent, StyleProp, Text, View, ViewStyle } from "react-native"
import { useEffect, useState } from "react"
import { Image, StyleSheet } from "react-native"
import { MapPin } from "@components/Common/Icons"
import { colours } from "@theme/colours"
import { fonts, textStyles } from "@theme/fonts"
import { getAspectRatio } from "@utils/image"

export type PinValue = BoundaryPosition & { label?: string }

export interface StaticPinLayerProps {
    imageUri: string
    values: PinValue[]
    style?: StyleProp<ViewStyle>
}

const PIN_WIDTH = 24;
const PIN_HEIGHT = 24;
const LABEL_WIDTH = 140;

export const StaticPinLayer = ({ imageUri, values, style }: StaticPinLayerProps) => {
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
        <View onLayout={onLayout} style={[styles.layer, { aspectRatio }, style]}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

            {values && layout.width > 0 && (
                values.map((value, index) => (
                    <View key={`${value.x}-${value.y}-${index}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <View
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
                        {!!value.label &&
                            <View
                                style={[
                                    styles.labelBox,
                                    {
                                        // Keep the label on the image near the left/right edges.
                                        left: Math.min(Math.max(value.x * layout.width - LABEL_WIDTH / 2, 0), layout.width - LABEL_WIDTH),
                                        top: value.y * layout.height + 2
                                    }
                                ]}
                            >
                                <Text style={styles.label} numberOfLines={2}>{value.label}</Text>
                            </View>
                        }
                    </View>
                ))

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
    labelBox: {
        position: "absolute",
        width: LABEL_WIDTH,
        alignItems: "center",
    },
    label: {
        ...textStyles.inputText,
        fontSize: fonts.size.sm,
        color: colours.light,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        borderRadius: 6,
        overflow: "hidden",
        paddingHorizontal: 6,
        paddingVertical: 2,
        textAlign: "center",
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