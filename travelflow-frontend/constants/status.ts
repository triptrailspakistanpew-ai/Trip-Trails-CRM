export const STATUS_STYLES = {
  // Lead statuses
  new:          { bg: 'var(--tf-info-soft)',    text: 'var(--tf-info)',    label: 'New' },
  contacted:    { bg: 'var(--tf-primary-soft)', text: 'var(--tf-primary)', label: 'Contacted' },
  follow_up:    { bg: 'var(--tf-warning-soft)', text: 'var(--tf-warning)', label: 'Follow Up' },
  interested:   { bg: 'var(--tf-primary-soft)', text: 'var(--tf-primary)', label: 'Interested' },
  negotiation:  { bg: 'var(--tf-warning-soft)', text: 'var(--tf-warning)', label: 'Negotiation' },
  converted:    { bg: 'var(--tf-success-soft)', text: 'var(--tf-success)', label: 'Converted' },
  lost:         { bg: 'var(--tf-danger-soft)',  text: 'var(--tf-danger)',  label: 'Lost' },

  // Booking statuses
  pending:      { bg: 'var(--tf-warning-soft)', text: 'var(--tf-warning)', label: 'Pending' },
  confirmed:    { bg: 'var(--tf-success-soft)', text: 'var(--tf-success)', label: 'Confirmed' },
  cancelled:    { bg: 'var(--tf-danger-soft)',  text: 'var(--tf-danger)',  label: 'Cancelled' },
  completed:    { bg: 'var(--tf-info-soft)',    text: 'var(--tf-info)',    label: 'Completed' },
  refunded:     { bg: 'var(--tf-accent-soft)',  text: 'var(--tf-accent)', label: 'Refunded' },

  // Payment statuses
  unpaid:       { bg: 'var(--tf-danger-soft)',  text: 'var(--tf-danger)',  label: 'Unpaid' },
  partial:      { bg: 'var(--tf-warning-soft)', text: 'var(--tf-warning)', label: 'Partial' },
  paid:         { bg: 'var(--tf-success-soft)', text: 'var(--tf-success)', label: 'Paid' },

  // General statuses
  active:       { bg: 'var(--tf-success-soft)', text: 'var(--tf-success)', label: 'Active' },
  inactive:     { bg: 'var(--tf-surface-2)',    text: 'var(--tf-text-secondary)', label: 'Inactive' },
} as const;

export type StatusType = keyof typeof STATUS_STYLES;
