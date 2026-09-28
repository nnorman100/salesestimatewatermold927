import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: __dirname,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // script-src needs two deliberate relaxations beyond 'self':
            //  - 'unsafe-inline': Next.js App Router injects inline
            //    `self.__next_f.push(...)` RSC streaming scripts without a nonce,
            //    so hydration breaks without it. Revisit with a nonce set via
            //    middleware for a stronger policy.
            //  - https://maps.googleapis.com: the Google Places autocomplete
            //    loader (@googlemaps/js-api-loader) injects the Maps JS at
            //    runtime; drop it only if Maps loading moves to a nonce'd
            //    next/script or a self-hosted loader.
            value: [
              "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.googleusercontent.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            // camera/microphone are denied because audio/photo capture currently
            // happens server-side via the Antigravity agent, not in the browser.
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
