export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        // Event pages are private invitations, not public content — a host's
        // guest list and standings should never appear in search results. The
        // console and account pages hold personal data and need a session.
        disallow: ["/e/", "/dashboard", "/account", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
