/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The screens are the prototype's React app, which reads these CRA-style
  // build flags. PROTOTYPE switches on the medical launch flow (hash routing,
  // launch stages, prototype permissions); the API lives on this same site.
  env: {
    REACT_APP_PROTOTYPE: 'true',
    REACT_APP_BACKEND_URL: '',
    PUBLIC_URL: '',
  },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}
export default nextConfig
