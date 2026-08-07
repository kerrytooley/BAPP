import { formatTime } from "./dateTimeUtils";

export const displayValue = (value?: string | Date | null, format?: "time"): string | Date =>
    value instanceof Date && format === "time"
        ? formatTime(value)
        : value || "N/A";