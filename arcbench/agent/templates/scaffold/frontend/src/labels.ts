// Official state names are displayed with their documented capitalisation.
export function stateLabel(state: string) {
  const labels: Record<string, string> = {
    open: 'Open',
    closed: 'Closed',
    draft: 'Draft',
    merged: 'Merged',
  };
  return labels[String(state || '').toLowerCase()] || state;
}

// REQ-6-3-4: review decisions are displayed with their documented names.
export function reviewLabel(state: string) {
  const labels: Record<string, string> = {
    APPROVED: 'Approved',
    CHANGES_REQUESTED: 'Changes requested',
    COMMENTED: 'Comment',
  };
  return labels[String(state || '').toUpperCase()] || state;
}

// REQ-4-2-1: history timestamps are shown as a relative value containing "ago".
export function relativeTime(value?: string) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  const units: [string, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
    }
  }
  return `${seconds} seconds ago`;
}
