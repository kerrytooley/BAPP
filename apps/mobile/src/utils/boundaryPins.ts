import type { Location, SurveyContext } from "@bapp/domain";
import type { PinValue } from "@components/Location/StaticPinLayer";

/** Boundary pins for the given locations, each labelled with the names of the surveyors assigned to it. */
export function boundaryPinsWithNames(context: SurveyContext | null | undefined, locations: Location[] = context?.locations ?? []): PinValue[] {
    return locations.flatMap((location) => {
        if (!location.boundaryPosition) return [];
        const names = (context?.surveyors ?? [])
            .filter((s) => s.locationId === location.id && !!s.name?.trim())
            .map((s) => s.name as string);
        return [{ ...location.boundaryPosition, label: names.join(", ") || undefined }];
    });
}
