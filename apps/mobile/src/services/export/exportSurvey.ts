import type { SurveyService } from "@bapp/domain";
import { assembleSurveyExport, exportFileName, JsZipPackager } from "@bapp/export";
import { ExpoMediaResolver } from "./expoMediaResolver";
import { shareExportFile, shareSurveyExport } from "./shareExport";

/** The slice of `SurveyService` the export needs (keeps tests easy to mock). */
export type ExportSurveyService = Pick<
    SurveyService,
    "getSurveyContext" | "getMediaUrl" | "supportsServerExport" | "getServerExport"
>;

export interface ExportSurveyResult {
    fileName: string;
    /** `true` if the OS share sheet opened; `false` if sharing was unavailable. */
    shared: boolean;
}

/**
 * Share the full survey export (flight-paths.html + survey-data.xlsx + media/).
 * Prefers the backend-built archive (a native download, no on-device work) and
 * falls back to building it on-device when the backend can't provide one.
 */
export async function exportSurvey(
    service: ExportSurveyService,
    surveyId: string,
): Promise<ExportSurveyResult> {
    const prebuilt = await downloadServerExport(service, surveyId);
    if (prebuilt) {
        return { fileName: prebuilt.fileName, shared: await shareExportFile(prebuilt.fileUri) };
    }

    const context = await service.getSurveyContext(surveyId);
    const { zip } = await assembleSurveyExport(context, {
        mediaResolver: new ExpoMediaResolver((ref) => service.getMediaUrl(ref)),
        packager: new JsZipPackager({ compression: "STORE" }),
    });

    const fileName = exportFileName(context.survey);
    const shared = await shareSurveyExport(zip, fileName);
    return { fileName, shared };
}

async function downloadServerExport(
    service: ExportSurveyService,
    surveyId: string,
): Promise<{ fileName: string; fileUri: string } | null> {
    if (!service.supportsServerExport()) return null;
    try {
        const ready = await service.getServerExport(surveyId);
        return { fileName: ready.fileName, fileUri: await service.getMediaUrl(ready.storagePath) };
    } catch (error) {
        console.warn("[export] server export unavailable, building on device:", error);
        return null;
    }
}
