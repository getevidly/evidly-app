// The platform default coverage and endorsement lists, as migration
// 20270104000000 inserts them. Test use only.
export const DEFAULT_OPTIONS_FOR_TEST = [
  { kind: "coverage", code: "general_liability", label: "General Liability", fields: ["per_occurrence", "aggregate"], sort_order: 10, active: true },
  { kind: "coverage", code: "workers_compensation", label: "Workers' Compensation", fields: [], sort_order: 20, active: true },
  { kind: "coverage", code: "commercial_auto", label: "Commercial Auto", fields: ["minimum"], sort_order: 30, active: true },
  { kind: "coverage", code: "umbrella_excess", label: "Umbrella or Excess", fields: ["minimum"], sort_order: 40, active: true },
  { kind: "endorsement", code: "additional_insured", label: "Additional Insured", fields: ["name"], sort_order: 10, active: true },
  { kind: "endorsement", code: "waiver_of_subrogation", label: "Waiver of Subrogation", fields: [], sort_order: 20, active: true },
  { kind: "endorsement", code: "primary_non_contributory", label: "Primary and Non-Contributory", fields: [], sort_order: 30, active: true },
  { kind: "endorsement", code: "notice_of_cancellation", label: "Notice of Cancellation", fields: ["days"], sort_order: 40, active: true },
  { kind: "endorsement", code: "other", label: "Other", fields: ["text"], sort_order: 50, active: true },
] as const;
