import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { Button } from "../Common/Button";

export interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    /** Shows a spinner instead of the confirm button; only `onCancel` (if given) can dismiss it. */
    loading?: boolean;
    onConfirm: () => void;
    /** Omit for an acknowledge-only dialog (single button, backdrop doesn't dismiss). */
    onCancel?: () => void;
}

export const ConfirmModal = ({ visible, ...props }: ConfirmModalProps) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={props.loading ? props.onCancel ?? (() => { }) : props.onCancel ?? props.onConfirm}>
        <ConfirmDialog {...props} />
    </Modal>
);

/** The dialog without its own Modal, for showing on top of content that is already in a Modal. */
export const ConfirmDialog = ({
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    loading = false,
    onConfirm,
    onCancel,
}: Omit<ConfirmModalProps, "visible">) => (
    <Pressable testID="confirm-modal-backdrop" style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        <Pressable style={styles.modal} onPress={() => { }}>
            {loading && <ActivityIndicator size="large" color={colours.light} style={styles.spinner} />}
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
            {!loading &&
                <View style={styles.actions}>
                    <Button variant={destructive ? "dark" : "light"} size="medium" label={confirmLabel} onPress={onConfirm} />
                    {onCancel && <Button variant={destructive ? "light" : "dark"} size="medium" label={cancelLabel} onPress={onCancel} />}
                </View>
            }
            {loading && onCancel &&
                <View style={styles.actions}>
                    <Button variant="light" size="medium" label={cancelLabel} onPress={onCancel} />
                </View>
            }
        </Pressable>
    </Pressable>
);

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modal: {
        width: "100%",
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        padding: 24,
        gap: 8,
    },
    title: {
        ...textStyles.title,
        textAlign: "left",
    },
    message: {
        ...textStyles.subtitle,
        textAlign: "left",
    },
    actions: {
        marginTop: 16,
        gap: 12,
    },
    spinner: {
        alignSelf: "flex-start",
        marginBottom: 8,
    },
});
