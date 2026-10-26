import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicBrandingService } from '../../../core/services/public-branding.service';
import { BrandingResponse } from '../../../core/services/cms.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    @if (b) {
      <!-- Page hero -->
      <section class="page-hero" [style]="heroGradient()">
        <div class="page-hero-overlay"></div>
        <div class="page-hero-content">
          <p class="eyebrow">Contactez-nous</p>
          <h1>Nous sommes à votre écoute</h1>
          @if (b.tagline) { <p class="hero-sub">{{ b.tagline }}</p> }
        </div>
      </section>

      <!-- Contact content -->
      <section class="contact-section">
        <div class="container">
          <div class="contact-grid">

            <!-- Info panel -->
            <aside class="contact-info">
              <h2 class="info-title" [style.color]="b.primaryColor">Nos coordonnées</h2>

              @if (b.contactPhone) {
                <div class="info-item">
                  <div class="info-icon" [style.color]="b.primaryColor" [style.background]="iconBg()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="info-label">Téléphone</p>
                    <a [href]="'tel:' + b.contactPhone" class="info-value">{{ b.contactPhone }}</a>
                  </div>
                </div>
              }

              @if (b.contactEmail) {
                <div class="info-item">
                  <div class="info-icon" [style.color]="b.primaryColor" [style.background]="iconBg()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                    </svg>
                  </div>
                  <div>
                    <p class="info-label">Email</p>
                    <a [href]="'mailto:' + b.contactEmail" class="info-value">{{ b.contactEmail }}</a>
                  </div>
                </div>
              }

              @if (b.contactAddress) {
                <div class="info-item">
                  <div class="info-icon" [style.color]="b.primaryColor" [style.background]="iconBg()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="info-label">Adresse</p>
                    <p class="info-value" style="font-size:.9rem;white-space:pre-line">{{ b.contactAddress }}</p>
                  </div>
                </div>
              }

              <!-- Social links -->
              @if (b.socialFacebook || b.socialLinkedin || b.socialInstagram || b.socialTwitter) {
                <div class="social-section">
                  <p class="social-label">Suivez-nous</p>
                  <div class="social-row">
                    @if (b.socialLinkedin) {
                      <a [href]="b.socialLinkedin" target="_blank" rel="noopener"
                         class="social-chip" [style.background]="iconBg()" [style.color]="b.primaryColor">
                        LinkedIn
                      </a>
                    }
                    @if (b.socialFacebook) {
                      <a [href]="b.socialFacebook" target="_blank" rel="noopener"
                         class="social-chip" [style.background]="iconBg()" [style.color]="b.primaryColor">
                        Facebook
                      </a>
                    }
                    @if (b.socialInstagram) {
                      <a [href]="b.socialInstagram" target="_blank" rel="noopener"
                         class="social-chip" [style.background]="iconBg()" [style.color]="b.primaryColor">
                        Instagram
                      </a>
                    }
                    @if (b.socialTwitter) {
                      <a [href]="b.socialTwitter" target="_blank" rel="noopener"
                         class="social-chip" [style.background]="iconBg()" [style.color]="b.primaryColor">
                        X / Twitter
                      </a>
                    }
                  </div>
                </div>
              }

              <!-- Devis shortcut -->
              <div class="devis-shortcut">
                <h3>Besoin d'un devis ?</h3>
                <p>Utilisez notre formulaire en ligne pour une réponse rapide.</p>
                <a [routerLink]="['/portal/quote-request']" class="devis-btn"
                   [style.background]="b.primaryColor">
                  Demander un devis
                </a>
              </div>
            </aside>

            <!-- Contact form -->
            <div class="contact-form-panel">
              @if (!sent()) {
                <h2 class="form-title">Envoyez-nous un message</h2>
                <p class="form-subtitle">
                  Nous vous répondrons dans les plus brefs délais.
                </p>
                <form (ngSubmit)="submit()" class="contact-form">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Prénom *</label>
                      <input [(ngModel)]="form.firstName" name="firstName" required placeholder="Jean">
                    </div>
                    <div class="form-group">
                      <label>Nom *</label>
                      <input [(ngModel)]="form.lastName" name="lastName" required placeholder="Dupont">
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Email *</label>
                    <input [(ngModel)]="form.email" name="email" type="email" required
                           placeholder="jean.dupont@exemple.fr">
                  </div>
                  <div class="form-group">
                    <label>Téléphone</label>
                    <input [(ngModel)]="form.phone" name="phone" type="tel" placeholder="+33 6 00 00 00 00">
                  </div>
                  <div class="form-group">
                    <label>Sujet *</label>
                    <input [(ngModel)]="form.subject" name="subject" required placeholder="Votre sujet">
                  </div>
                  <div class="form-group">
                    <label>Message *</label>
                    <textarea [(ngModel)]="form.message" name="message" required
                              rows="5" placeholder="Décrivez votre demande..."></textarea>
                  </div>
                  <button type="submit" class="submit-btn" [style.background]="b!.primaryColor"
                          [disabled]="!form.firstName || !form.email || !form.message">
                    Envoyer le message
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                    </svg>
                  </button>
                </form>
              } @else {
                <div class="success-state">
                  <div class="success-icon" [style.color]="b!.primaryColor">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3>Message envoyé !</h3>
                  <p>Merci pour votre message. Nous vous répondrons dans les plus brefs délais.</p>
                  <button class="reset-btn" (click)="sent.set(false)" [style.background]="b!.primaryColor">
                    Envoyer un autre message
                  </button>
                </div>
              }
            </div>

          </div>
        </div>
      </section>

    } @else {
      <div class="loading-screen"><div class="spinner"></div></div>
    }
  `,
  styles: [`
    .page-hero {
      min-height:48vh;position:relative;
      display:flex;align-items:center;justify-content:center;
    }
    .page-hero-overlay {
      position:absolute;inset:0;
      background:linear-gradient(135deg,rgba(0,0,0,.58) 0%,rgba(0,0,0,.32) 100%);
    }
    .page-hero-content {
      position:relative;z-index:1;text-align:center;
      padding:4rem 1.5rem;animation:fadeUp .6s ease both;
    }
    .eyebrow { font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.65);margin:0 0 .75rem; }
    .page-hero-content h1 { font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:#fff;margin:0 0 .75rem; }
    .hero-sub { color:rgba(255,255,255,.75);font-size:1.05rem;margin:0; }

    /* ── Contact layout ── */
    .contact-section { padding:6rem 1.5rem; }
    .container { max-width:1200px;margin:0 auto; }
    .contact-grid { display:grid;grid-template-columns:1fr 1.6fr;gap:5rem;align-items:start; }

    /* ── Info panel ── */
    .contact-info { display:flex;flex-direction:column;gap:2rem; }
    .info-title { font-size:1.4rem;font-weight:800;margin:0; }

    .info-item { display:flex;align-items:flex-start;gap:1rem; }
    .info-icon {
      width:44px;height:44px;border-radius:10px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
    }
    .info-icon svg { width:22px;height:22px; }
    .info-label { font-size:.75rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .2rem; }
    .info-value { font-size:.95rem;color:#0f172a;font-weight:500;margin:0;text-decoration:none; }
    a.info-value:hover { text-decoration:underline; }

    .social-section { margin-top:-.5rem; }
    .social-label { font-size:.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin:0 0 .75rem; }
    .social-row { display:flex;flex-wrap:wrap;gap:.5rem; }
    .social-chip {
      display:inline-block;padding:.4rem .9rem;border-radius:20px;
      font-size:.8rem;font-weight:600;text-decoration:none;
      transition:opacity .2s;
    }
    .social-chip:hover { opacity:.75; }

    .devis-shortcut {
      background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;
      padding:1.5rem;display:flex;flex-direction:column;gap:.75rem;
    }
    .devis-shortcut h3 { font-size:1rem;font-weight:700;color:#0f172a;margin:0; }
    .devis-shortcut p  { font-size:.875rem;color:#64748b;margin:0; }
    .devis-btn {
      display:inline-block;padding:.65rem 1.25rem;border-radius:8px;
      font-size:.875rem;font-weight:700;color:#fff;text-decoration:none;
      transition:opacity .2s;align-self:start;
    }
    .devis-btn:hover { opacity:.85; }

    /* ── Form panel ── */
    .contact-form-panel {
      background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:2.5rem;
    }
    .form-title    { font-size:1.5rem;font-weight:800;color:#0f172a;margin:0 0 .5rem; }
    .form-subtitle { font-size:.9rem;color:#64748b;margin:0 0 2rem; }

    .contact-form { display:flex;flex-direction:column;gap:1.25rem; }
    .form-row  { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
    .form-group { display:flex;flex-direction:column;gap:.4rem; }
    .form-group label { font-size:.82rem;font-weight:600;color:#374151; }
    .form-group input, .form-group textarea {
      padding:.65rem .9rem;border:1.5px solid #e2e8f0;border-radius:8px;
      font-size:.9rem;font-family:inherit;transition:border-color .2s;
      outline:none;resize:vertical;
    }
    .form-group input:focus, .form-group textarea:focus {
      border-color: var(--pub-primary, #1976D2);
    }

    .submit-btn {
      display:inline-flex;align-items:center;gap:.6rem;
      padding:.8rem 1.75rem;border-radius:10px;border:none;
      font-size:.95rem;font-weight:700;color:#fff;cursor:pointer;
      align-self:start;transition:opacity .2s,transform .2s;
    }
    .submit-btn:hover:not(:disabled) { opacity:.88;transform:translateY(-1px); }
    .submit-btn:disabled { opacity:.5;cursor:not-allowed; }
    .submit-btn svg { width:18px;height:18px; }

    /* Success */
    .success-state { text-align:center;padding:3rem 1rem;display:flex;flex-direction:column;align-items:center;gap:1rem; }
    .success-icon svg { width:64px;height:64px; }
    .success-state h3 { font-size:1.25rem;font-weight:700;color:#0f172a;margin:0; }
    .success-state p  { color:#64748b;margin:0;max-width:360px; }
    .reset-btn {
      padding:.65rem 1.5rem;border-radius:8px;border:none;
      font-size:.875rem;font-weight:700;color:#fff;cursor:pointer;
      margin-top:.5rem;transition:opacity .2s;
    }
    .reset-btn:hover { opacity:.85; }

    /* Loading */
    .loading-screen { min-height:100vh;display:flex;align-items:center;justify-content:center; }
    .spinner { width:48px;height:48px;border:4px solid #e2e8f0;border-top-color:var(--pub-primary,#1976D2);border-radius:50%;animation:spin .8s linear infinite; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
    @keyframes spin   { to{transform:rotate(360deg)} }

    @media (max-width:900px) {
      .contact-grid { grid-template-columns:1fr; }
      .form-row     { grid-template-columns:1fr; }
    }
  `],
})
export class ContactComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly pubBranding = inject(PublicBrandingService);

  get b(): BrandingResponse | null { return this.pubBranding.branding(); }

  readonly sent = signal(false);

  form = { firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' };

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('t');
    this.pubBranding.load(t);
  }

  heroGradient(): string {
    const c1 = this.b?.primaryColor   || '#1976D2';
    const c2 = this.b?.secondaryColor || '#424242';
    return `background: linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  }

  iconBg(): string {
    return `color-mix(in srgb, ${this.b?.primaryColor || '#1976D2'} 12%, transparent)`;
  }

  submit(): void {
    // In a real app, POST to a contact/support endpoint.
    // For now, just show the success state.
    this.sent.set(true);
    this.form = { firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' };
  }
}
