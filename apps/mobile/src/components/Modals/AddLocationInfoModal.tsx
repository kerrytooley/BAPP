import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { Modal, Pressable, StyleSheet } from "react-native"
import { InputField } from "../Common/InputField";
import { Button } from "../Common/Button";
import { useEffect, useState } from "react";
import { isBlank, NotesProps } from "@bapp/domain";

interface LocationInfoModalProps {
    isFullScreen: boolean
    setIsFullScreen: (value: boolean) => void;
    saveNote: (note: NotesProps | undefined) => void
}

export const LocationInfoModal = ({ isFullScreen, setIsFullScreen, saveNote }: LocationInfoModalProps) => {

    const [note, setNote] = useState<string | undefined>();

    useEffect(() => {
        if (isFullScreen) setNote("");
    }, [isFullScreen]);

    return (
        <Modal
            visible={isFullScreen}
            transparent
            animationType="fade"
            onRequestClose={() => {
                setNote(undefined)
                setIsFullScreen(false)
            }}
        >
            <Pressable testID="survey-info-backdrop" style={styles.infoBackdrop} onPress={() => setIsFullScreen(false)}>
                <Pressable style={styles.infoModal} >
                    <InputField
                        fieldLabel="Add Survey Note"
                        placeholderText="e.g. Streetlights turned on at 21:52"
                        size="large"
                        value={note}
                        onChangeText={setNote} />
                    <Button
                        disabled={isBlank(note)}
                        label="Save note"
                        onPress={() => {
                            saveNote({ text: (note as string).trim(), time: new Date() })
                            setIsFullScreen(false)
                        }} />
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    infoBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    infoModal: {
        width: "100%",
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        padding: 24,
        gap: 8,
    },
    infoTitle: {
        ...textStyles.title,
        textAlign: "left",
    },
})