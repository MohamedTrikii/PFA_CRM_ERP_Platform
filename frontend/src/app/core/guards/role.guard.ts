import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, take } from 'rxjs/operators';

/**
 * Usage in routes:
 *   canActivate: [authGuard, roleGuard(['EMPLOYER','SUPER_ADMIN'])]
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => () => {
  const oidc   = inject(OidcSecurityService);
  const router = inject(Router);

  return oidc.getPayloadFromAccessToken().pipe(
    take(1),
    map((payload: any) => {
      const realmRoles: string[] =
        payload?.realm_access?.roles ?? [];
      const allowed = allowedRoles.some(r => realmRoles.includes(r));
      if (!allowed) router.navigate(['/forbidden']);
      return allowed;
    }),
  );
};
