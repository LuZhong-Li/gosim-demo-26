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
