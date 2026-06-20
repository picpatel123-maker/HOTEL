import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — don't allow this page inside an iframe
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  // Stop browsers from guessing content types (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Force HTTPS for 1 year, including subdomains (HSTS)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },

  // Only send the origin as referrer (not full URL) to external sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Restrict browser feature access
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },

  // Content Security Policy — allow Leaflet tiles and Overpass API, block everything else
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts and Recharts/Leaflet need unsafe-inline in dev; tighten for prod if needed
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Nominatim geocoding (client-side) + OSM tiles; Overpass is proxied server-side
      "connect-src 'self' https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
      // OSM tile images
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },

  // Remove the X-Powered-By header so attackers can't fingerprint the framework
  // (Next.js removes this automatically, but be explicit)
];

const nextConfig: NextConfig = {
  // Security: strip X-Powered-By
  poweredByHeader: false,

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Restrict external images to trusted domains only
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
