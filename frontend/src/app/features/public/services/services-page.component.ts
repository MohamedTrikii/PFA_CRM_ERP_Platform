import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { PublicBrandingService } from '../../../core/services/public-branding.service';
import { BrandingResponse, ServiceItem } from '../../../core/services/cms.service';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (b) {
      <!-- Page hero -->
      <section class="page-hero" [style]="heroGradient()">
        <div class="page-hero-overlay"></div>
        <div class="page-hero-content">
          <p class="eyebrow">Nos expertises</p>
          <h1>Nos services</h1>
          @if (b.tagline) { <p class="hero-sub">{{ b.tagline }}</p> }
        </div>
      </section>

      <!-- Services list -->
      <section class="services-section">
        <div class="container">
          @if (services.length) {
            <div class="services-list">
              @for (svc of services; track svc.title; let i = $index) {
                <div class="service-row" [class.service-row-reverse]="i % 2 === 1">
                  <!-- Icon panel -->
                  <div class="svc-icon-panel" [style.background]="iconBg()">
                    @if (svc.icon) {
                      <span class="svc-emoji">{{ svc.icon }}</span>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                           [style.color]="b!.primaryColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                      </svg>
                    }
                    <div class="svc-number" [style.color]="b!.primaryColor + '55'">0{{ i + 1 }}</div>
                  </div>
                  <!-- Text panel -->
                  <div class="svc-text">
                    <h2 [style.color]="b!.primaryColor">{{ svc.title }}</h2>
                    <p>{{ svc.description }}</p>
                    <a [routerLink]="['/portal/quote-request']" class="svc-cta"
                       [style.background]="b!.primaryColor">
                      Demander un devis pour ce service
                    </a>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Empty state -->
            <div class="empty-state">
              <div class="empty-icon" [style.color]="b!.primaryColor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <h3>Services en cours de configuration</h3>
              <p>
                Configurez vos services depuis
                <strong>Administration → Personnalisation → Contenu du site</strong>.
              </p>
            </div>
          }
        </div>
      </section>

      <!-- CTA strip -->
      <section class="cta-strip" [style.background]="b.primaryColor">
        <div class="container cta-inner">
          <div>
            <h2>Un projet en tête ?</h2>
            <p>Obtenez un devis personnalisé et gratuit en quelques minutes.</p>
          </div>
          <a [routerLink]="['/portal/quote-request']" class="cta-btn">
            Demander un devis →
          </a>
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

    .services-section { padding:6rem 1.5rem; }
    .container { max-width:1200px;margin:0 auto; }

    .services-list { display:flex;flex-direction:column;gap:6rem; }

    .service-row {
      display:grid;grid-template-columns:1fr 1.4fr;gap:4rem;align-items:center;
    }
    .service-row-reverse { direction:rtl; }
    .service-row-reverse > * { direction:ltr; }

    .svc-icon-panel {
      border-radius:24px;padding:3rem;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:280px;position:relative;overflow:hidden;
    }
    .svc-emoji { font-size:4.5rem;line-height:1; }
    .svc-icon-panel svg { width:72px;height:72px; }
    .svc-number {
      position:absolute;bottom:.75rem;right:1.25rem;
      font-size:4rem;font-weight:900;line-height:1;
    }

    .svc-text { display:flex;flex-direction:column;gap:1.25rem; }
    .svc-text h2 { font-size:1.75rem;font-weight:800;margin:0; }
    .svc-text p  { font-size:1rem;color:#475569;line-height:1.85;margin:0; }

    .svc-cta {
      display:inline-block;padding:.75rem 1.75rem;border-radius:10px;
      font-size:.9rem;font-weight:700;color:#fff;text-decoration:none;
      transition:opacity .2s,transform .2s;align-self:start;
    }
    .svc-cta:hover { opacity:.88;transform:translateY(-1px); }

    /* Empty */
    .empty-state { text-align:center;padding:6rem 1.5rem;display:flex;flex-direction:column;align-items:center;gap:1rem; }
    .empty-icon svg { width:64px;height:64px; }
    .empty-state h3 { font-size:1.25rem;font-weight:700;color:#0f172a;margin:0; }
    .empty-state p  { color:#64748b;margin:0; }

    /* CTA strip */
    .cta-strip { padding:5rem 1.5rem; }
    .cta-inner { display:flex;justify-content:space-between;align-items:center;gap:2rem;flex-wrap:wrap; }
    .cta-inner h2 { font-size:1.75rem;font-weight:800;color:#fff;margin:0 0 .5rem; }
    .cta-inner p  { color:rgba(255,255,255,.8);margin:0;font-size:1rem; }
    .cta-btn {
      display:inline-block;padding:.9rem 2rem;border-radius:10px;
      background:#fff;font-size:1rem;font-weight:700;text-decoration:none;
      flex-shrink:0;transition:transform .2s;box-shadow:0 4px 18px rgba(0,0,0,.18);
    }
    .cta-btn:hover { transform:translateY(-2px); }

    /* Loading */
    .loading-screen { min-height:100vh;display:flex;align-items:center;justify-content:center; }
    .spinner { width:48px;height:48px;border:4px solid #e2e8f0;border-top-color:var(--pub-primary,#1976D2);border-radius:50%;animation:spin .8s linear infinite; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
    @keyframes spin   { to{transform:rotate(360deg)} }

    @media (max-width:900px) {
      .service-row { grid-template-columns:1fr; }
      .service-row-reverse { direction:ltr; }
      .cta-inner { flex-direction:column;text-align:center; }
    }
  `],
})
export class ServicesPageComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly pubBranding = inject(PublicBrandingService);

  get b(): BrandingResponse | null { return this.pubBranding.branding(); }
  get services(): ServiceItem[] { return this.b?.services ?? []; }

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
    return `color-mix(in srgb, ${this.b?.primaryColor || '#1976D2'} 10%, #f1f5f9)`;
  }
}
