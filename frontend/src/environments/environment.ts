export const environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  keycloak: {
    authority: 'http://localhost:8180/realms/erp',
    redirectUrl: window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin,
    clientId: 'erp-web',
    scope: 'openid profile email',
    responseType: 'code',
    silentRenew: false,
    useRefreshToken: true,
    renewTimeBeforeTokenExpiresInSeconds: 30,
  },
};
