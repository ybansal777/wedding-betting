// The event types a host can pick at setup. Keep this in sync with the
// `event_type` check constraint in supabase/schema.sql.
export const EVENT_TYPES = [
  { key: "wedding", label: "Wedding" },
  { key: "bachelor_bachelorette", label: "Bachelor/ette party" },
  { key: "birthday", label: "Birthday" },
  { key: "family_reunion", label: "Family reunion" },
  { key: "other", label: "Something else" },
];

export const EVENT_TYPE_KEYS = EVENT_TYPES.map((t) => t.key);

export const DEFAULT_EVENT_TYPE = "other";
