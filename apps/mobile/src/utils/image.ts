import { Image } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { base64ToBytes } from "@utils/base64";

export const getAspectRatio = (boundaryImageUri: string): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
        Image.getSize(
            boundaryImageUri,
            (imageWidth, imageHeight) => {
                if (imageWidth > 0 && imageHeight > 0) {
                    resolve(imageWidth / imageHeight);
                } else {
                    reject(new Error(`Invalid image dimensions: ${imageWidth}x${imageHeight}`));
                }
            },
            reject
        );
    });
}

export const createImageBody = async (imageUri: string) => {
    const uri = imageUri as string;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = base64ToBytes(base64);
    const fileName = uri.split("/").pop() as string;
    return { fileName: fileName, bytes: bytes }
}