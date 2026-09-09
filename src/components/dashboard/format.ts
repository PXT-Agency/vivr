export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function titleCase(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

/** Turn a machine value into a human label, e.g. `dry_run` → `Dry run`. */
export function humanizeLabel(value: string): string {
  return titleCase(value.replace(/_/g, " "));
}