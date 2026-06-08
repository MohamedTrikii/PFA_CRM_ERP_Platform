import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { RouterLink }      from '@angular/router';

@Component({
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--clr-bg, #f1f5f9);
    }

    .error-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      background: #fff;
      border-radius: 20px;
      padding: 3.5rem 4rem;
      box-shadow: 0 4px 32px rgba(0,0,0,.08);
      text-align: center;
      max-width: 420px;
      animation: fadeInUp .35s ease both;
    }

    .error-icon-wrap {
      width: 5rem;
      height: 5rem;
      border-radius: 50%;
      background: #fef2f2;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        color: #ef4444;
      }
    }

    .error-code {
      font-size: 3.5rem;
      font-weight: 800;
      color: #ef4444;
      line-height: 1;
      letter-spacing: -.04em;
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
    }

    p {
      margin: 0;
      font-size: .9375rem;
      color: #64748b;
      line-height: 1.6;
    }

    .actions {
      display: flex;
      gap: .75rem;
      margin-top: .5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
  template: `
    <div class="error-card">
      <div class="error-icon-wrap">
        <mat-icon>lock</mat-icon>
      </div>

      <div class="error-code">403</div>
      <h2>Accès refusé</h2>
      <p>Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>

      <div class="actions">
        <a mat-raised-button color="primary" routerLink="/dashboard">
          <mat-icon>home</mat-icon>
          Tableau de bord
        </a>
        <a mat-stroked-button routerLink="/login">
          <mat-icon>login</mat-icon>
          Se connecter
        </a>
      </div>
    </div>
  `,
})
export class ForbiddenComponent {}
