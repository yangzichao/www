export const SITE_TIME_ZONE = 'America/New_York';

const siteTimestampFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: SITE_TIME_ZONE,
});

export function formatSiteTimestamp(isoTimestamp: string): string {
  return siteTimestampFormat.format(new Date(isoTimestamp));
}
