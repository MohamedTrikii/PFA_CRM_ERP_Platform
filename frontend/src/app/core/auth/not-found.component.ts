import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <div class="nf-code">404</div>
      <h1 class="nf-title">Page introuvable</h1>
      <p class="nf-sub">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <a routerLink="/accueil" class="nf-btn">Retour à l'accueil</a>
    </div>
  `,
  styles: [`
    .not-found {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      text-align: center;
      padding: 2rem;
      background: #f1f5f9;
    }
    .nf-code {
      font-size: 7rem;
      font-weight: 900;
      color: #e2e8f0;
      line-height: 1;
      letter-spacing: -.05em;
    }
    .nf-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .nf-sub {
      color: #64748b;
      margin: 0;
      font-size: 1rem;
      max-width: 380px;
    }
    .nf-btn {
      margin-top: .5rem;
      display: inline-block;
      padding: .75rem 2rem;
      background: #2563eb;
      color: #fff;
      border-radius: 10px;
      font-weight: 600;
      text-decoration: none;
      font-size: .95rem;
      transition: opacity .2s;
    }
    .nf-btn:hover { opacity: .85; }
  `],
})
export class NotFoundComponent {}
