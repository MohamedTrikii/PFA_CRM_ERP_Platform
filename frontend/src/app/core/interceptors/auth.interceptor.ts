import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { switchMap, take } from 'rxjs/operators';

/**
 * Attaches the Bearer access-token to every outgoing API call.
 * Skips requests that already have an Authorization header (e.g. Keycloak itself).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept calls to our own API
  if (!req.url.includes('/api/')) return next(req);

  const oidc = inject(OidcSecurityService);

  return oidc.getAccessToken().pipe(
    take(1),
    switchMap(token => {
      if (!token) {
        console.warn('[authInterceptor] No token available for request to:', req.url);
        return next(req);
      }
      console.log('[authInterceptor] Attaching token to request:', req.url, 'token starts with:', token.substring(0, 20) + '...');
      return next(
        req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
      );
    }),
  );
};

