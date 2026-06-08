import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatProgressSpinnerModule }      from '@angular/material/progress-spinner';
import { OidcSecurityService }           from 'angular-auth-oidc-client';
import { Router }                        from '@angular/router';
import { Subscription, EMPTY }           from 'rxjs';
import { filter, take, timeout, catchError } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [MatProgressSpinnerModule],
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--clr-bg, #f1f5f9);
    }

    .auth-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      background: #fff;
      border-radius: 16px;
      padding: 3rem 3.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
      animation: fadeInUp .35s ease both;
    }

    .auth-logo {
      width: 3rem;
      height: 3rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
      letter-spacing: -.01em;
    }

    p {
      margin: 0;
      font-size: .875rem;
      color: #64748b;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
  template: `
    <div class="auth-card">
      <div class="auth-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z"
                fill="white" fill-opacity=".9"/>
        </svg>
      </div>
      <mat-spinner diameter="32"/>
      <h2>Connexion en cours…</h2>
      <p>Authentification via Keycloak</p>
    </div>
  `,
})
export class CallbackComponent implements OnInit, OnDestroy {
  private sub?: Subscription;

  constructor(
    private readonly oidc: OidcSecurityService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.sub = this.oidc.isAuthenticated$.pipe(
      filter(({ isAuthenticated }) => isAuthenticated),
      take(1),
      timeout(5000),
      catchError(() => {
        this.oidc.authorize();
        return EMPTY;
      }),
    ).subscribe(() => this.router.navigateByUrl('/dashboard'));
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
