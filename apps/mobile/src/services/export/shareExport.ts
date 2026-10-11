import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const ZIP_MIME = "application/zip";

/**
 * Write the export zip to the app cache and open the OS share sheet so the admin
 * can send it wherever they like (email, Drive, AirDrop, etc.).
 *
 * Returns `false` when sharing is unavailable on the device (the file is still
 * written to the cache), otherwise `true`.
 */
export async function shareSurveyExport(
    zip: Uint8Array,
    fileName: string,
): Promise<boolean> {
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(zip);
    return shareExportFile(file.uri);
}

/** Open the OS share sheet for an export zip already on disk; `false` if sharing is unavailable. */
export async function shareExportFile(fileUri: string): Promise<boolean> {
    if (!(await Sharing.isAvailableAsync())) return false;

    await Sharing.shareAsync(fileUri, {
        mimeType: ZIP_MIME,
        dialogTitle: "Share survey export",
        UTI: "public.zip-archive",
    });
    return true;
}
