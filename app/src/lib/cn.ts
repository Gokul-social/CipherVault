// Simple cn utility — avoids adding clsx/tailwind-merge as deps
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
