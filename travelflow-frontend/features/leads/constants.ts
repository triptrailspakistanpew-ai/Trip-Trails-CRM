export const leadStatusOptions = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Follow Up", value: "follow_up" },
  { label: "Interested", value: "interested" },
  { label: "Negotiation", value: "negotiation" },
  { label: "Converted", value: "converted" },
  { label: "Lost", value: "lost" },
] as const;

export const leadStatusValues = leadStatusOptions.map(({ value }) => value);
