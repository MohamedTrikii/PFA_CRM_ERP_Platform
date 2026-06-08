import { Injectable, inject, signal } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { take } from 'rxjs/operators';
import { IdentityService, TenantResponse } from './identity.service';

@Injectable({ providedIn: 'root' })
export class AuthContextService {
  private readonly oidc        = inject(OidcSecurityService);
  private readonly identitySvc = inject(IdentityService);

  readonly isSuperAdmin = signal(false);
  readonly tenants      = signal<TenantResponse[]>([]);

  init(): void {
    this.oidc.getPayloadFromAccessToken().pipe(take(1)).subscribe((payload: any) => {
      const roles: string[] = payload?.realm_access?.roles ?? [];
      const isAdmin = roles.includes('SUPER_ADMIN');
      this.isSuperAdmin.set(isAdmin);

      if (isAdmin) {
        this.identitySvc.getTenants(0, 200).subscribe(page =>
          this.tenants.set(page.content.filter(t => t.active))
        );
      }
    });
  }
}
