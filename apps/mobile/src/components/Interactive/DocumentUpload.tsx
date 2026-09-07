import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { getAspectRatio } from "@utils/image";
import { Upload as UploadIcon } from "@components/Common/Icons"

export interface DocumentUploadProps {
    onChange: (uri: string) => void;
    value?: string;
}

export const DocumentUpload = ({ onChange, value }: DocumentUploadProps) => {
    const { showActionSheetWithOptions } = useActionSheet();
    const [aspectRatio, setAspectRatio] = useState<number>();

    useEffect(() => {
        if (!value) {
            setAspectRatio(undefined);
            return;
        }
        let cancelled = false;
        getAspectRatio(value)
            .then((ratio) => { if (!cancelled) setAspectRatio(ratio); })
            .catch((e) => console.error("Error getting preview aspect ratio", e));
        return () => { cancelled = true; };
    }, [value]);

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ["image/png", "image/jpeg", "application/pdf"],
            copyToCacheDirectory: true,
        });

        if (!result.canceled) {
            onChange(result.assets[0].uri)
        }
    };

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            onChange(result.assets[0].uri)
        }
    }

    const chooseSource = () => {
        const options = ["Photo Library", "Files", "Cancel"];
        const cancelButtonIndex = 2;

        showActionSheetWithOptions(
            { options, cancelButtonIndex },
            (index) => {
                if (index === 0) pickImage();
                if (index === 1) pickDocument();
            }
        );
    };

    return (
        <TouchableOpacity style={[styles.container, !value && styles.containerEmpty]} onPress={chooseSource}>
            {value
                ?
                <View style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Image
                        source={{ uri: value }}
                        style={[styles.preview, aspectRatio ? { aspectRatio } : null]}
                        resizeMode="contain"
                    />
                    <Text style={textStyles.subtitle}>Tap to choose again</Text>
                </View>
                : <View style={styles.placeholder}>
                    <UploadIcon width={24} />
                    <Text style={textStyles.placeholderText}>Tap to upload</Text>
                </View>}
        </TouchableOpacity >
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        borderRadius: 16,
        justifyContent: "center",
    },
    containerEmpty: {
        height: "60%",
        backgroundColor: colours.cardbackground,
    },
    preview: {
        width: "100%",
        aspectRatio: 1.5,
        maxHeight: 400,
        borderRadius: 16
    },
    placeholder: {
        width: "100%",
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        gap: 16
    }
});