import { isBlank, type MediaAsset, type SurveyContext, type Weather } from "@bapp/domain";

export type ItemStatus = "complete" | "incomplete" | "missing";

export interface StatusRow {
    key: string;
    label: string;
    status: ItemStatus;
    detail?: string;
}

const SEVERITY: Record<ItemStatus, number> = { complete: 0, incomplete: 1, missing: 2 };

export function worstStatus(rows: StatusRow[]): ItemStatus {
    return rows.reduce<ItemStatus>(
        (worst, row) => (SEVERITY[row.status] > SEVERITY[worst] ? row.status : worst),
        "complete",
    );
}

function filled(value: unknown): boolean {
    if (value instanceof Date) return true;
    return typeof value === "string" ? !isBlank(value) : value != null;
}

function fieldsStatus(values: unknown[] | null | undefined): ItemStatus {
    if (!values) return "missing";
    const count = values.filter(filled).length;
    if (count === values.length) return "complete";
    return count === 0 ? "missing" : "incomplete";
}

function photoStatus(asset: MediaAsset | null | undefined): ItemStatus {
    if (!asset) return "missing";
    return asset.status === "failed" ? "incomplete" : "complete";
}

export function getSetupRows(context: SurveyContext): StatusRow[] {
    const { survey, surveyors, locations } = context;

    const boundaryStatus: ItemStatus = !survey.boundary
        ? "missing"
        : survey.boundary.status === "ready" ? "complete" : "incomplete";

    const named = surveyors.filter((s) => !isBlank(s.name));
    const leadNamed = named.some((s) => s.isLead);
    const pinned = (locationId: string | null) =>
        !!locations.find((l) => l.id === locationId)?.boundaryPosition;
    const allPinned = !survey.boundary || surveyors.every((s) => pinned(s.locationId));
    const surveyorsStatus: ItemStatus = named.length === 0
        ? "missing"
        : leadNamed && named.length === surveyors.length && allPinned ? "complete" : "incomplete";

    return [
        {
            key: "details",
            label: "Survey details",
            status: fieldsStatus([survey.name, survey.postcode, survey.date, survey.startTime, survey.endTime, survey.sunsetTime]),
        },
        { key: "boundary", label: "Red line boundary", status: boundaryStatus },
        { key: "surveyors", label: "Surveyors & locations", status: surveyorsStatus },
    ];
}

export function getSurveyorRows(context: SurveyContext, surveyorId: string): StatusRow[] {
    const surveyor = context.surveyors.find((s) => s.id === surveyorId);
    if (!surveyor) return [];
    const location = context.locations.find((l) => l.id === surveyor.locationId);
    const equipment = location?.equipmentInformation;
    const weatherStatus = (w: Weather | null) =>
        fieldsStatus(w && [w.temperature, w.cloudCover, w.humidity, w.wind, w.rain]);

    const rows: StatusRow[] = [
        { key: "name", label: "Name", status: isBlank(surveyor.name) ? "missing" : "complete" },
        context.survey.boundary
            ? { key: "location", label: "Location", status: location?.boundaryPosition ? "complete" : "missing" }
            : { key: "location", label: "Location", status: "complete", detail: "Not required" },
    ];
    if (surveyor.isLead) {
        rows.push({ key: "startWeather", label: "Start weather", status: weatherStatus(context.survey.startWeather) });
    }
    rows.push(
        { key: "frontView", label: "Front view photo", status: photoStatus(location?.frontViewImage) },
        { key: "equipmentPhoto", label: "Equipment photo", status: photoStatus(location?.equipmentImage) },
        {
            key: "equipmentDetails",
            label: "Equipment details",
            status: fieldsStatus(equipment && [equipment.audioLabel, equipment.videoLabel, equipment.otherInfo]),
        },
    );
    if (surveyor.isLead) {
        rows.push({ key: "endWeather", label: "End weather", status: weatherStatus(context.survey.endWeather) });
    }
    return rows;
}
