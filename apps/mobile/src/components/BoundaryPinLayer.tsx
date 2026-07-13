import { BoundaryPosition } from "@bapp/domain"
import { GestureResponderEvent, LayoutChangeEvent, View } from "react-native"
import { useState } from "react"
import { Image, Pressable, StyleSheet } from "react-native"
import MapPin from "@assets/images/mapPin.svg"
import { colours } from "@theme/colours"

interface BoundaryPinLayerProps {
    imageUri: string
    value: BoundaryPosition | null
    onChange: (position: BoundaryPosition) => void
    aspectRatio: number
}

const PIN_WIDTH = 24;
const PIN_HEIGHT = 24;

export const BoundaryPinLayer = ({ imageUri, value, onChange, aspectRatio }: BoundaryPinLayerProps) => {
    const [layout, setLayout] = useState({ width: 0, height: 0 });

    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout
        setLayout({ width, height })
    }

    const handlePress = (event: GestureResponderEvent) => {
        if (layout.width === 0 || layout.height === 0) return
        const { locationX, locationY } = event.nativeEvent
        const x = Math.min(Math.max(locationX / layout.width, 0), 1)
        const y = Math.min(Math.max(locationY / layout.height, 0), 1)
        onChange({ x, y })
    }

    return (
        <Pressable onLayout={onLayout} onPress={handlePress} style={[styles.layer, { aspectRatio }]}>
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
    }
})