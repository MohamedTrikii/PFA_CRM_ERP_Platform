import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { EmployerDashboardComponent }  from './employer-dashboard.component';
import { EmployeeDashboardComponent }  from './employee-dashboard.component';
import { ClientDashboardComponent }    from './client-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, EmployerDashboardComponent, EmployeeDashboardComponent, ClientDashboardComponent],
  template: `
    <div class="erp-page">
      <div class="erp-page-header">
        <h1>Tableau de bord</h1>
      </div>

      @switch (role) {
        @case ('SUPER_ADMIN') { <app-employer-dashboard/> }
        @case ('EMPLOYER')    { <app-employer-dashboard/> }
        @case ('EMPLOYEE')    { <app-employee-dashboard/> }
        @case ('CLIENT')      { <app-client-dashboard/>   }
        @default {
          <div class="erp-empty">
            <p class="empty-title">Chargement…</p>
          </div>
        }
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly oidc = inject(OidcSecurityService);

  role = '';

  ngOnInit() {
    this.oidc.getPayloadFromAccessToken().subscribe((payload: any) => {
      const roles: string[] = payload?.realm_access?.roles ?? [];
      if (roles.includes('SUPER_ADMIN'))   this.role = 'SUPER_ADMIN';
      else if (roles.includes('EMPLOYER')) this.role = 'EMPLOYER';
      else if (roles.includes('EMPLOYEE')) this.role = 'EMPLOYEE';
      else if (roles.includes('CLIENT'))   this.role = 'CLIENT';
    });
  }
}
