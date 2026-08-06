import { Image } from "react-native";

export const getAspectRatio = (boundaryImageUri: string) => {
    return new Promise<number>((resolve, reject) => {
        Image.getSize(
            boundaryImageUri,
            (imageWidth, imageHeight) => resolve(imageWidth / imageHeight),
            reject
        );
    });
}