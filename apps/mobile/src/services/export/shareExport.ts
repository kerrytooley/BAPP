import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { bytesToBase64 } from "@utils/base64";

const ZIP_MIME = "application/zip";

/**
 * Write the export zip to the app cache and open the OS share sheet so the admin
 * can send it wherever they like (email, Drive, AirDrop, etc.).
 *
 * Returns `false` when sharing is unavailable on the device (the file is still
 * written to `fileUri`), otherwise `true`.
 */
export async function shareSurveyExport(
    zip: Uint8Array,
    fileName: string,
): Promise<boolean> {
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, bytesToBase64(zip), {
        encoding: FileSystem.EncodingType.Base64,
    });

    if (!(await Sharing.isAvailableAsync())) return false;

    await Sharing.shareAsync(fileUri, {
        mimeType: ZIP_MIME,
        dialogTitle: "Share survey export",
        UTI: "public.zip-archive",
    });
    return true;
}
