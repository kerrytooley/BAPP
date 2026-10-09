import { BoundaryPosition } from "@bapp/domain"
import { GestureResponderEvent, LayoutChangeEvent, View } from "react-native"
import { useEffect, useState, type ReactNode } from "react"
import { Image, Pressable, StyleSheet } from "react-native"
import { MapPin } from "@components/Common/Icons"
import { colours } from "@theme/colours"
import { getAspectRatio } from "@utils/image"

interface PressablePinLayerProps {
    imageUri: string
    value: BoundaryPosition | null
    onChange: (position: BoundaryPosition) => void
    /** Rendered directly beneath the image; its height is reserved when fitting the image. */
    footer?: ReactNode
}

const PIN_WIDTH = 24;
const PIN_HEIGHT = 24;
const FOOTER_GAP = 8;

export const PressablePinLayer = ({ imageUri, value, onChange, footer }: PressablePinLayerProps) => {
    const [layout, setLayout] = useState({ width: 0, height: 0 });
    const [available, setAvailable] = useState({ width: 0, height: 0 });
    const [footerHeight, setFooterHeight] = useState(0);
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

    const onContainerLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout
        setAvailable({ width, height })
    }

    // Fit the image inside the available area while preserving its aspect ratio,
    // so tall (portrait) images shrink to fit rather than overflowing.
    const fitted = (() => {
        const availableHeight = footer ? available.height - footerHeight - FOOTER_GAP : available.height;
        if (!available.width || !availableHeight || availableHeight <= 0) {
            return { width: available.width || undefined, aspectRatio };
        }
        const heightFromWidth = available.width / aspectRatio;
        if (heightFromWidth <= availableHeight) {
            return { width: available.width, height: heightFromWidth };
        }
        return { width: availableHeight * aspectRatio, height: availableHeight };
    })();

    const handlePress = (event: GestureResponderEvent) => {
        if (layout.width === 0 || layout.height === 0) return
        const { locationX, locationY } = event.nativeEvent
        const x = Math.min(Math.max(locationX / layout.width, 0), 1)
        const y = Math.min(Math.max(locationY / layout.height, 0), 1)
        onChange({ x, y })
    }

    return (
        <View style={styles.fill} onLayout={onContainerLayout}>
            <Pressable onLayout={onLayout} onPress={handlePress} style={[styles.layer, fitted]}>
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
            </Pressable>
            {footer &&
                <View style={styles.footer} onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
                    {footer}
                </View>
            }
        </View>
    );
}

const styles = StyleSheet.create({
    fill: {
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    layer: {
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
    footer: {
        width: "100%",
        marginTop: FOOTER_GAP,
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