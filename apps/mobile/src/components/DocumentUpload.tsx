import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import UploadIcon from "@assets/icons/upload.svg"

export interface DocumentUploadProps {
    onChange: (uri: string) => void;
    value?: string;
}

export const DocumentUpload = ({ onChange, value }: DocumentUploadProps) => {
    const { showActionSheetWithOptions } = useActionSheet();

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
            allowsEditing: true,
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
        <TouchableOpacity style={styles.container} onPress={chooseSource}>
            {value
                ?
                <View style={{ gap: 8 }}>
                    <Image source={{ uri: value }} style={styles.preview} />
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
    placeholder: {
        width: "100%",
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        gap: 16
    }
});