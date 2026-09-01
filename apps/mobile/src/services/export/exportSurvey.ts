import type { SurveyService } from "@bapp/domain";
import { assembleSurveyExport, JsZipPackager } from "@bapp/export";
import { ExpoMediaResolver } from "./expoMediaResolver";
import { shareSurveyExport } from "./shareExport";

/** The slice of `SurveyService` the export needs (keeps tests easy to mock). */
export type ExportSurveyService = Pick<
    SurveyService,
    "getSurveyContext" | "getMediaUrl"
>;

export interface ExportSurveyResult {
    fileName: string;
    /** `true` if the OS share sheet opened; `false` if sharing was unavailable. */
    shared: boolean;
}

/**
 * Build and share the full survey export (flight-paths.html + survey-data.xlsx +
 * media/) for a survey. Resolves images on-device and delivers the zip via the
 * share sheet.
 */
export async function exportSurvey(
    service: ExportSurveyService,
    surveyId: string,
): Promise<ExportSurveyResult> {
    const context = await service.getSurveyContext(surveyId);
    const { zip } = await assembleSurveyExport(context, {
        mediaResolver: new ExpoMediaResolver((ref) => service.getMediaUrl(ref)),
        packager: new JsZipPackager(),
    });

    const fileName = buildFileName(context.survey.name, context.survey.postcode, context.survey.date);
    const shared = await shareSurveyExport(zip, fileName);
    return { fileName, shared };
}

function buildFileName(
    surveyName: string | null,
    postcode: string | null,
    date: Date | null,
): string {
    const slug = (value: string): string =>
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    const parts = [
        slug(surveyName ?? "survey") || "survey",
        postcode ? slug(postcode) : "",
        date ? formatDate(date) : "",
    ].filter(Boolean);

    return `${parts.join("-")}-results.zip`;
}

/** UTC YYYY-MM-DD, matching the report's date formatting. */
function formatDate(date: Date): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
