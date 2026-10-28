// Admin-entered URLs often lack a scheme ("www.acme.com"), which the browser
// would treat as a relative path (/ref/www.acme.com). Prefix https:// when
// missing, and drop anything that isn't plain http(s) so a stray
// "javascript:" value can never become a clickable link.
export function toExternalUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
