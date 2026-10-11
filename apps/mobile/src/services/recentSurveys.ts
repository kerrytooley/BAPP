import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Survey } from "@bapp/domain";

export type RecentRole = "admin" | "surveyor";

export interface RecentSurvey {
    surveyId: string;
    role: RecentRole;
    name: string | null;
    postcode: string | null;
    surveyorId?: string;
    surveyCreatedAt: string;
    lastOpenedAt: string;
}

export const RECENT_SURVEYS_KEY = "bapp.recentSurveys.v1";
export const RECENT_SURVEY_LIFETIME_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const sameEntry = (a: Pick<RecentSurvey, "surveyId" | "role">, b: Pick<RecentSurvey, "surveyId" | "role">) =>
    a.surveyId === b.surveyId && a.role === b.role;

const byLastOpened = (a: RecentSurvey, b: RecentSurvey) => b.lastOpenedAt.localeCompare(a.lastOpenedAt);

export function upsertRecent(list: RecentSurvey[], entry: RecentSurvey): RecentSurvey[] {
    const existing = list.find((e) => sameEntry(e, entry));
    const merged = { ...entry, surveyorId: entry.surveyorId ?? existing?.surveyorId };
    return [merged, ...list.filter((e) => !sameEntry(e, entry))].sort(byLastOpened);
}

export function removeRecent(list: RecentSurvey[], key: Pick<RecentSurvey, "surveyId" | "role">): RecentSurvey[] {
    return list.filter((e) => !sameEntry(e, key));
}

export function pruneExpired(list: RecentSurvey[], now: Date): RecentSurvey[] {
    const cutoff = now.getTime() - RECENT_SURVEY_LIFETIME_DAYS * DAY_MS;
    return list.filter((e) => new Date(e.surveyCreatedAt).getTime() >= cutoff);
}

function isRecentSurvey(value: unknown): value is RecentSurvey {
    const v = value as RecentSurvey;
    return !!v && typeof v.surveyId === "string" && (v.role === "admin" || v.role === "surveyor")
        && typeof v.surveyCreatedAt === "string" && typeof v.lastOpenedAt === "string";
}

async function read(): Promise<RecentSurvey[]> {
    try {
        const raw = await AsyncStorage.getItem(RECENT_SURVEYS_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(isRecentSurvey) : [];
    } catch (e) {
        console.error("Failed to read recent surveys", e);
        return [];
    }
}

async function write(list: RecentSurvey[]): Promise<void> {
    try {
        await AsyncStorage.setItem(RECENT_SURVEYS_KEY, JSON.stringify(list));
    } catch (e) {
        console.error("Failed to save recent surveys", e);
    }
}

export async function loadRecentSurveys(now: Date = new Date()): Promise<RecentSurvey[]> {
    const stored = await read();
    const kept = pruneExpired(stored, now).sort(byLastOpened);
    if (kept.length !== stored.length) await write(kept);
    return kept;
}

export async function recordRecentSurvey(
    survey: Survey,
    role: RecentRole,
    surveyorId?: string,
    now: Date = new Date(),
): Promise<void> {
    try {
        const list = await read();
        await write(upsertRecent(list, {
            surveyId: survey.id,
            role,
            name: survey.name,
            postcode: survey.postcode,
            surveyorId,
            surveyCreatedAt: survey.createdAt.toISOString(),
            lastOpenedAt: now.toISOString(),
        }));
    } catch (e) {
        console.error("Failed to record recent survey", e);
    }
}

export async function forgetRecentSurvey(surveyId: string, role: RecentRole): Promise<void> {
    await write(removeRecent(await read(), { surveyId, role }));
}
