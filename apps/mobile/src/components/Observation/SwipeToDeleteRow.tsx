import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface SwipeToDeleteRowProps {
    children: React.ReactNode;
    onDelete: () => void;
}

const DELETE_WIDTH = 90;

export const SwipeToDeleteRow = ({
    children,
    onDelete,
}: SwipeToDeleteRowProps) => {
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            startX.value = translateX.value;
        })
        .onUpdate((event) => {
            const newX = startX.value + event.translationX;

            // Only allow swiping left
            translateX.value = Math.min(0, Math.max(-DELETE_WIDTH, newX));
        })
        .onEnd(() => {
            // Snap open or closed
            if (translateX.value < -DELETE_WIDTH / 2) {
                translateX.value = withSpring(-DELETE_WIDTH);
            } else {
                translateX.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const handleDelete = () => {
        onDelete();
        translateX.value = withSpring(0);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteContainer}>
                <Text
                    style={styles.deleteText}
                >
                    Delete
                </Text>
            </TouchableOpacity>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={animatedStyle}>
                    {children}
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        overflow: "hidden",
        borderRadius: 16,
    },

    deleteContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "red",
        width: DELETE_WIDTH,
        left: undefined,
        right: 0,
        justifyContent: "center",
        alignItems: "center",
    },

    deleteText: {
        color: "white",
        fontWeight: "600",
    },
});