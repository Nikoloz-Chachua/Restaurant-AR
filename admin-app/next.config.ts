import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent the admin panel from being embedded in iframes on other sites
  { key: 'X-Frame-Options',           value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  // Only send origin in referrer, never full URL
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  // Block access to camera/mic/location from admin panel JS
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
