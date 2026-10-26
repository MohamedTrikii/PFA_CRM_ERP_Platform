import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { PublicBrandingService } from '../../../core/services/public-branding.service';
import { BrandingResponse, GalleryItem, ServiceItem, StatItem } from '../../../core/services/cms.service';
import { OidcSecurityService } from 'angular-auth-oidc-client';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (b) {

      <!-- ── HERO ────────────────────────────────────────────────────────── -->
      <section class="hero" [style]="heroStyle()">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          @if (b.tagline) { <p class="hero-eyebrow">{{ b.tagline }}</p> }
          <h1 class="hero-title">
            {{ b.heroTitle || b.companyName || 'Bienvenue' }}
          </h1>
          @if (b.heroSubtitle) {
            <p class="hero-subtitle">{{ b.heroSubtitle }}</p>
          }
          <div class="hero-cta">
            <a [routerLink]="['/portal/quote-request']" class="cta-primary"
               [style.background]="b.primaryColor">
              {{ b.heroCtaText || 'Demander un devis' }}
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </a>
            <button class="cta-secondary" (click)="login()">
              Se connecter
            </button>
          </div>
        </div>
        <a class="scroll-hint" [routerLink]="['/accueil']" fragment="services">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
        </a>
      </section>

      <!-- ── STATS BAR ────────────────────────────────────────────────────── -->
      @if (stats.length) {
        <section class="stats-bar" [style.background]="b.primaryColor">
          @for (s of stats; track s.label) {
            <div class="stat-item">
              <span class="stat-value">{{ s.value }}</span>
              <span class="stat-label">{{ s.label }}</span>
            </div>
          }
        </section>
      }

      <!-- ── SERVICES ─────────────────────────────────────────────────────── -->
      @if (services.length) {
        <section id="services" class="section">
          <div class="container">
            <div class="section-header">
              <p class="section-eyebrow" [style.color]="b.primaryColor">Nos expertises</p>
              <h2 class="section-title">Ce que nous faisons</h2>
              <p class="section-subtitle">
                Des solutions professionnelles adaptées à chacun de vos projets.
              </p>
            </div>
            <div class="services-grid">
              @for (svc of services; track svc.title) {
                <div class="service-card">
                  <div class="service-icon" [style.background]="iconBg()" [style.color]="b.primaryColor">
                    @if (svc.icon) {
                      <span class="icon-emoji">{{ svc.icon }}</span>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
                    }
                  </div>
                  <h3 class="service-title">{{ svc.title }}</h3>
                  <p class="service-desc">{{ svc.description }}</p>
                  <a [routerLink]="['/nos-services']" [queryParamsHandling]="'preserve'"
                     class="service-link" [style.color]="b.primaryColor">
                    En savoir plus →
                  </a>
                </div>
              }
            </div>
          </div>
        </section>
      }

      <!-- ── ABOUT PREVIEW ─────────────────────────────────────────────────── -->
      @if (b.aboutText || b.aboutTitle) {
        <section class="about-preview" [style.background]="aboutBg()">
          <div class="container about-grid">
            <div class="about-visual">
              <div class="about-shape" [style.background]="b.primaryColor"></div>
              <div class="about-shape about-shape-2" [style.background]="b.secondaryColor"></div>
              @if (b.logoUrl) {
                <img [src]="b.logoUrl" [alt]="b.companyName" class="about-logo-large">
              }
            </div>
            <div class="about-text-col">
              <p class="section-eyebrow" [style.color]="b.primaryColor">Qui sommes-nous</p>
              <h2 class="section-title">{{ b.aboutTitle || b.companyName }}</h2>
              <p class="about-body">{{ b.aboutText }}</p>
              <a [routerLink]="['/a-propos']" [queryParamsHandling]="'preserve'"
                 class="cta-primary" [style.background]="b.primaryColor">
                En savoir plus
              </a>
            </div>
          </div>
        </section>
      }

      <!-- ── GALLERY PREVIEW ───────────────────────────────────────────────── -->
      @if (gallery.length) {
        <section class="section">
          <div class="container">
            <div class="section-header">
              <p class="section-eyebrow" [style.color]="b.primaryColor">Nos réalisations</p>
              <h2 class="section-title">Galerie de projets</h2>
            </div>
            <div class="gallery-grid">
              @for (img of gallery.slice(0, 6); track img.fid; let i = $index) {
                <a [routerLink]="['/galerie']" [queryParamsHandling]="'preserve'"
                   class="gallery-thumb" [class.gallery-thumb-wide]="i === 0">
                  <img [src]="img.url" [alt]="img.alt || img.caption"
                       onerror="this.style.display='none'">
                  @if (img.caption) {
                    <div class="gallery-caption">{{ img.caption }}</div>
                  }
                </a>
              }
            </div>
            <div style="text-align:center;margin-top:2rem">
              <a [routerLink]="['/galerie']" [queryParamsHandling]="'preserve'"
                 class="cta-outline" [style.border-color]="b.primaryColor" [style.color]="b.primaryColor">
                Voir toute la galerie
              </a>
            </div>
          </div>
        </section>
      }

      <!-- ── CONTACT CTA BAND ──────────────────────────────────────────────── -->
      @if (b.contactEmail || b.contactPhone) {
        <section class="cta-band" [style.background]="b.primaryColor">
          <div class="container cta-band-inner">
            <div>
              <h2 class="cta-band-title">Prêt à démarrer votre projet ?</h2>
              <p class="cta-band-sub">Contactez-nous dès aujourd'hui pour un devis gratuit et personnalisé.</p>
              <div class="cta-contacts">
                @if (b.contactPhone) {
                  <a [href]="'tel:' + b.contactPhone" class="cta-contact-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
                    {{ b.contactPhone }}
                  </a>
                }
                @if (b.contactEmail) {
                  <a [href]="'mailto:' + b.contactEmail" class="cta-contact-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                    {{ b.contactEmail }}
                  </a>
                }
              </div>
            </div>
            <a [routerLink]="['/portal/quote-request']" class="cta-band-btn">
              Demander un devis
            </a>
          </div>
        </section>
      }

    } @else {
      <div class="loading-hero">
        <div class="loading-spinner"></div>
      </div>
    }
  `,
  styles: [`
    /* ── Hero ──────────────────────────────────────────────────────────────── */
    .hero {
      min-height: 100vh; position: relative;
      display: flex; align-items: center; justify-content: center;
      background-size: cover; background-position: center;
    }
    .hero-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(135deg,rgba(0,0,0,.62) 0%,rgba(0,0,0,.35) 100%);
    }
    .hero-content {
      position: relative; z-index: 1; text-align: center;
      padding: 2rem 1.5rem; max-width: 800px;
      animation: fadeUp .7s ease both;
    }
    .hero-eyebrow {
      font-size: .95rem; font-weight: 600; letter-spacing: .12em;
      text-transform: uppercase; color: rgba(255,255,255,.7); margin: 0 0 1rem;
    }
    .hero-title {
      font-size: clamp(2.4rem, 6vw, 4.5rem); font-weight: 800;
      color: #fff; margin: 0 0 1.25rem; line-height: 1.1;
    }
    .hero-subtitle {
      font-size: clamp(1rem, 2.5vw, 1.25rem); color: rgba(255,255,255,.82);
      margin: 0 auto 2rem; max-width: 600px; line-height: 1.65;
    }
    .hero-cta { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

    .cta-primary {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .85rem 2rem; border-radius: 10px; font-size: 1rem; font-weight: 700;
      color: #fff; text-decoration: none;
      box-shadow: 0 4px 20px rgba(0,0,0,.25);
      transition: transform .2s, opacity .2s;
    }
    .cta-primary:hover { transform: translateY(-2px); opacity: .9; }
    .cta-primary svg  { width: 18px; height: 18px; }

    .cta-secondary {
      display: inline-flex; align-items: center;
      padding: .85rem 2rem; border-radius: 10px; font-size: 1rem; font-weight: 700;
      color: #fff; background: rgba(255,255,255,.15);
      border: 2px solid rgba(255,255,255,.5); cursor: pointer;
      backdrop-filter: blur(4px); transition: background .2s;
    }
    .cta-secondary:hover { background: rgba(255,255,255,.25); }

    .scroll-hint {
      position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,.5); animation: bounce 2s infinite;
    }
    .scroll-hint svg { width: 28px; height: 28px; }

    /* ── Stats bar ──────────────────────────────────────────────────────────── */
    .stats-bar {
      display: flex; flex-wrap: wrap; justify-content: center;
      gap: 0; padding: 0;
    }
    .stat-item {
      flex: 1 1 160px;
      padding: 2rem 1.5rem; text-align: center;
      border-right: 1px solid rgba(255,255,255,.15);
      display: flex; flex-direction: column; gap: .25rem;
    }
    .stat-item:last-child { border-right: none; }
    .stat-value { font-size: 2.25rem; font-weight: 800; color: #fff; line-height: 1; }
    .stat-label { font-size: .82rem; color: rgba(255,255,255,.75); font-weight: 500; }

    /* ── Section commons ────────────────────────────────────────────────────── */
    .section      { padding: 6rem 1.5rem; }
    .container    { max-width: 1200px; margin: 0 auto; }
    .section-header { text-align: center; margin-bottom: 3.5rem; }
    .section-eyebrow {
      font-size: .8rem; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; display: block; margin-bottom: .75rem;
    }
    .section-title  { font-size: clamp(1.75rem, 3.5vw, 2.5rem); font-weight: 800; color: #0f172a; margin: 0 0 1rem; }
    .section-subtitle { font-size: 1rem; color: #64748b; max-width: 520px; margin: 0 auto; line-height: 1.7; }

    /* ── Services grid ──────────────────────────────────────────────────────── */
    .services-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.75rem;
    }
    .service-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 2rem; display: flex; flex-direction: column; gap: .75rem;
      transition: transform .25s, box-shadow .25s;
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,.10); }
    .service-icon {
      width: 56px; height: 56px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .service-icon svg { width: 28px; height: 28px; }
    .icon-emoji { font-size: 1.6rem; line-height: 1; }
    .service-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; }
    .service-desc  { font-size: .9rem; color: #64748b; margin: 0; line-height: 1.65; flex: 1; }
    .service-link  { font-size: .85rem; font-weight: 600; text-decoration: none; margin-top: auto; }

    /* ── About preview ──────────────────────────────────────────────────────── */
    .about-preview { padding: 6rem 1.5rem; }
    .about-grid {
      display: grid; grid-template-columns: 1fr 1.2fr; gap: 5rem; align-items: center;
    }
    .about-visual {
      position: relative; height: 420px; border-radius: 24px; overflow: hidden;
    }
    .about-shape {
      position: absolute; width: 70%; height: 70%; border-radius: 24px; opacity: .18;
      top: 0; left: 0;
    }
    .about-shape-2 {
      top: auto; left: auto; bottom: 0; right: 0; opacity: .12;
    }
    .about-logo-large {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: contain; padding: 3rem;
    }
    .about-text-col { display: flex; flex-direction: column; gap: 1.25rem; }
    .about-body { font-size: 1rem; color: #475569; line-height: 1.8; margin: 0; }

    /* ── Gallery grid ───────────────────────────────────────────────────────── */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 220px;
      gap: 1rem;
    }
    .gallery-thumb {
      border-radius: 12px; overflow: hidden; position: relative;
      background: #e2e8f0; display: block; text-decoration: none;
    }
    .gallery-thumb-wide { grid-column: span 2; }
    .gallery-thumb img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform .4s ease;
    }
    .gallery-thumb:hover img { transform: scale(1.04); }
    .gallery-caption {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: .75rem 1rem; background: linear-gradient(transparent, rgba(0,0,0,.55));
      color: #fff; font-size: .8rem; font-weight: 500;
    }

    .cta-outline {
      display: inline-block; padding: .75rem 2rem; border-radius: 10px;
      border: 2px solid; font-weight: 600; text-decoration: none; font-size: .95rem;
      transition: background .2s, color .2s;
    }

    /* ── CTA Band ───────────────────────────────────────────────────────────── */
    .cta-band { padding: 5rem 1.5rem; }
    .cta-band-inner {
      display: flex; justify-content: space-between; align-items: center;
      gap: 2rem; flex-wrap: wrap;
    }
    .cta-band-title { font-size: 1.75rem; font-weight: 800; color: #fff; margin: 0 0 .5rem; }
    .cta-band-sub   { color: rgba(255,255,255,.8); margin: 0 0 1rem; font-size: 1rem; }
    .cta-contacts   { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .cta-contact-link {
      display: flex; align-items: center; gap: .5rem;
      color: rgba(255,255,255,.9); text-decoration: none; font-size: .95rem; font-weight: 500;
      transition: color .2s;
    }
    .cta-contact-link:hover { color: #fff; }
    .cta-contact-link svg { width: 18px; height: 18px; flex-shrink: 0; }
    .cta-band-btn {
      display: inline-block; padding: 1rem 2.25rem; border-radius: 10px;
      background: #fff; font-size: 1rem; font-weight: 700;
      text-decoration: none; flex-shrink: 0;
      transition: transform .2s; box-shadow: 0 4px 20px rgba(0,0,0,.15);
    }
    .cta-band-btn:hover { transform: translateY(-2px); }

    /* ── Loading ────────────────────────────────────────────────────────────── */
    .loading-hero {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
    }
    .loading-spinner {
      width: 48px; height: 48px; border: 4px solid #e2e8f0;
      border-top-color: var(--pub-primary, #1976D2);
      border-radius: 50%; animation: spin .8s linear infinite;
    }

    /* ── Animations ─────────────────────────────────────────────────────────── */
    @keyframes fadeUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: none; } }
    @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(8px)} }
    @keyframes spin   { to { transform: rotate(360deg); } }

    /* ── Responsive ─────────────────────────────────────────────────────────── */
    @media (max-width: 900px) {
      .about-grid         { grid-template-columns: 1fr; }
      .about-visual       { height: 240px; }
      .gallery-grid       { grid-template-columns: repeat(2, 1fr); }
      .gallery-thumb-wide { grid-column: span 1; }
      .cta-band-inner     { flex-direction: column; text-align: center; }
      .cta-contacts       { justify-content: center; }
    }
    @media (max-width: 540px) {
      .hero-cta     { flex-direction: column; align-items: center; }
      .gallery-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class HomeComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly oidc        = inject(OidcSecurityService);
  private readonly pubBranding = inject(PublicBrandingService);

  get b(): BrandingResponse | null { return this.pubBranding.branding(); }
  get services(): ServiceItem[] { return this.b?.services ?? []; }
  get gallery(): GalleryItem[]  { return this.b?.gallery  ?? []; }
  get stats(): StatItem[]       { return this.b?.stats    ?? []; }

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('t');
    this.pubBranding.load(t);
  }

  heroStyle(): string {
    const c1 = this.b?.primaryColor   || '#1976D2';
    const c2 = this.b?.secondaryColor || '#424242';
    return `background: linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  }

  aboutBg(): string {
    return `color-mix(in srgb, ${this.b?.primaryColor || '#1976D2'} 5%, #f8fafc)`;
  }

  iconBg(): string {
    return `color-mix(in srgb, ${this.b?.primaryColor || '#1976D2'} 12%, transparent)`;
  }

  login(): void { this.oidc.authorize(); }
}
