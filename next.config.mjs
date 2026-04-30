import withPWAInit from '@ducanh2912/next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: isDev,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/simulations'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'senlab-simulations',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 jours
        },
      },
      {
        urlPattern: ({ url }) => url.pathname === '/users/me',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'senlab-me',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 }, // 1h
        },
      },
    ],
  },
});

const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
};

export default withPWA(nextConfig);
