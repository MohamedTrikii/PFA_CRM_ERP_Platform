export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  keycloak: {
    authority: '${KEYCLOAK_URL}/realms/erp',   // replaced at build time via Docker env
    redirectUrl: '${APP_URL}/auth/callback',
    postLogoutRedirectUri: '${APP_URL}',
    clientId: 'erp-web',
    scope: 'openid profile email',
    responseType: 'code',
    silentRenew: true,
    useRefreshToken: true,
    renewTimeBeforeTokenExpiresInSeconds: 30,
  },
};
