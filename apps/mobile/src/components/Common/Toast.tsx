import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ToastProps {
    visible: boolean;
    message: string;
    onUndo: () => void;
    onDone: () => void;
    /** Auto-dismiss delay in ms. Defaults to 4000. */
    duration?: number;
}

export const Toast = ({ visible, message, onUndo, onDone, duration = 4000 }: ToastProps) => {
    const insets = useSafeAreaInsets();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (!visible) return;

        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => onDone(), duration);
        return () => clearTimeout(timer);
    }, [visible, message, duration, onDone, opacity, translateY]);

    if (!visible) return null;

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[
                styles.wrapper,
                { bottom: 16 + insets.bottom, opacity, transform: [{ translateY }] },
            ]}
        >
            <View style={styles.toast}>
                <Text style={styles.message} numberOfLines={2}>{message}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={onUndo} accessibilityRole="button" accessibilityLabel="Undo">
                        <Text style={styles.undo}>Undo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDone} accessibilityRole="button" accessibilityLabel="Done">
                        <Text style={styles.done}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        left: 16,
        right: 16,
    },
    toast: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        backgroundColor: colours.cardbackground,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colours.buttonBorder,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    message: {
        ...textStyles.inputText,
        color: colours.light,
        flex: 1,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },
    undo: {
        ...textStyles.buttonLabel,
        color: colours.placeholderText,
    },
    done: {
        ...textStyles.buttonLabel,
        color: colours.light,
    },
});
