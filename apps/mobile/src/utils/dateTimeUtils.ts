export const formatDate = (value?: Date | null) =>
    value
        ? new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(value)
        : 'Date not found';

export const formatTime = (value?: Date | null) =>
    value
        ? new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(value)
        : 'Time not found';


export function formatCountdown(
    hours: number,
    minutes: number,
    seconds: number
) {
    return [hours, minutes, seconds]
        .map(value => String(value).padStart(2, '0'))
        .join(':');
}
