import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, take, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const oidc   = inject(OidcSecurityService);
  const router = inject(Router);

  return oidc.isAuthenticated$.pipe(
    take(1),
    timeout(3000),
    catchError(() => of({ isAuthenticated: false })),
    map(({ isAuthenticated }) => {
      if (isAuthenticated) return true;
      try {
        oidc.authorize();
      } catch {
        return router.createUrlTree(['/accueil']);
      }
      return false;
    }),
  );
};
