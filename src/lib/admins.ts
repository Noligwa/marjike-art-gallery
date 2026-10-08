/** The only two people allowed into the studio panel. */
export const ADMIN_EMAILS = [
  "lbadenhorst@gmail.com",
  "marikeholscher@gmail.com",
] as const;

export function isAllowedAdmin(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.includes(
    (email ?? "").trim().toLowerCase() as (typeof ADMIN_EMAILS)[number],
  );
}
