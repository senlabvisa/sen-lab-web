import withPWAInit from '@ducanh2912/next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: isDev,
  // Sans cette exclusion, next-pwa précache tout `public/` sans plafond de
  // taille : les ~31 Mo de modèles 3D de l'atlas seraient téléchargés dès
  // l'installation du service worker, avant même que l'élève ouvre l'atlas.
  // Les règles `senlab-atlas-*` ci-dessous les mettent en cache à la demande.
  publicExcludes: ['!noprecache/**/*', '!anatomie/**/*'],
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/anatomie/modeles/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'senlab-atlas-modeles',
          // 9 organes ; un modèle ne change pas une fois publié.
          expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 180 },
          cacheableResponse: { statuses: [0, 200] },
          rangeRequests: true,
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/anatomie/images/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'senlab-atlas-images',
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 180 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
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
