import type { Survey } from '@bapp/domain';

/** `{name}-{postcode}-{YYYY-MM-DD}-results.zip`, slugified; shared by device and server exports. */
export function exportFileName(survey: Pick<Survey, 'name' | 'postcode' | 'date'>): string {
  const slug = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const parts = [
    slug(survey.name ?? 'survey') || 'survey',
    survey.postcode ? slug(survey.postcode) : '',
    survey.date ? formatDate(survey.date) : '',
  ].filter(Boolean);

  return `${parts.join('-')}-results.zip`;
}

/** UTC YYYY-MM-DD, matching the report's date formatting. */
function formatDate(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
