import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { BackButton } from "./Button";
import { Home } from "./Icons";
import { ConfirmModal } from "../Modals/ConfirmModal";

export interface ScreenHeaderProps {
    // Loosely typed so any stack's navigation object fits; 'Welcome' lives on the root stack.
    navigation: { goBack: () => void; navigate: (...args: never[]) => void };
    /** Replaces the default "confirm then go home" behaviour. */
    onHome?: () => void;
}

export const ScreenHeader = ({ navigation, onHome }: ScreenHeaderProps) => {
    const [confirmingHome, setConfirmingHome] = useState(false);

    const goHome = () => {
        setConfirmingHome(false);
        (navigation.navigate as unknown as (name: string) => void)("Welcome");
    };

    return (
        <View style={styles.header}>
            <BackButton navigation={navigation} />
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Return home"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={onHome ?? (() => setConfirmingHome(true))}
            >
                <Home width={24} />
            </TouchableOpacity>
            <ConfirmModal
                visible={confirmingHome}
                title="Return home?"
                message="You can pick up where you left off later. Anything not yet saved on this screen will be lost."
                confirmLabel="Return home"
                onConfirm={goHome}
                onCancel={() => setConfirmingHome(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});
