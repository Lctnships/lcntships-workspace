import type { NextConfig } from "next";

/**
 * LCN-012 — strict security headers.
 *
 * CSP is intentionally strict but pragmatic for a Next.js 16 + React 19 +
 * Tailwind app: 'unsafe-inline' is kept on style-src (Tailwind injects
 * inline styles) and on script-src for the time being (Next still emits
 * inline bootstrap). LCN-022 will replace these with per-request nonces.
 *
 * connect-src whitelists Supabase + Resend + same-origin.
 * frame-ancestors 'none' is a clickjacking shield (replaces X-Frame-Options).
 * HSTS uses 2-year max-age + preload — only safe once the apex + every
 * subdomain is HTTPS-only (it is, via Cloudflare Full(strict) per LCN-011).
 */
const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  // Inline + eval: needed by Next dev runtime; tighten under LCN-022.
  // vercel.live = Vercel's live feedback script injected op preview/prod
  `script-src 'self' 'unsafe-inline' https://vercel.live ${isProd ? "" : "'unsafe-eval'"}`.trim(),
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://vercel.com https://vercel.live",
  "font-src 'self' data: https://vercel.live https://assets.vercel.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://vercel.live wss://ws-us3.pusher.com",
  "frame-src 'self' https://vercel.live",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // HSTS only in prod — local https is uncommon and would lock dev browsers.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-email/components"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
