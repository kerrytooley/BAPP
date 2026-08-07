import { Image } from "react-native";

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