import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { PublicBrandingService } from '../../../core/services/public-branding.service';
import { BrandingResponse } from '../../../core/services/cms.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (b) {
      <!-- Page hero -->
      <section class="page-hero" [style]="heroGradient()">
        <div class="page-hero-overlay"></div>
        <div class="page-hero-content">
          <p class="eyebrow">À propos</p>
          <h1>{{ b.aboutTitle || b.companyName }}</h1>
          @if (b.tagline) { <p class="hero-sub">{{ b.tagline }}</p> }
        </div>
      </section>

      <!-- About content -->
      <section class="about-section">
        <div class="container">
          <div class="about-layout">
            <!-- Visual panel -->
            <aside class="about-visual">
              <div class="visual-card" [style.border-color]="b.primaryColor + '33'">
                @if (b.logoUrl) {
                  <img [src]="b.logoUrl" [alt]="b.companyName" class="visual-logo">
                }
                @if (b.stats?.length) {
                  <div class="visual-stats">
                    @for (s of b.stats!; track s.label) {
                      <div class="vs-item" [style.border-color]="b.primaryColor + '22'">
                        <span class="vs-value" [style.color]="b.primaryColor">{{ s.value }}</span>
                        <span class="vs-label">{{ s.label }}</span>
                      </div>
                    }
                  </div>
                }
                <div class="visual-accent" [style.background]="b.primaryColor"></div>
              </div>
            </aside>

            <!-- Text panel -->
            <div class="about-text">
              <p class="section-eyebrow" [style.color]="b.primaryColor">Notre histoire</p>
              <h2 class="about-heading">{{ b.aboutTitle || 'Qui sommes-nous ?' }}</h2>
              @if (b.aboutText) {
                <div class="about-body">
                  @for (para of paragraphs(); track para) {
                    <p>{{ para }}</p>
                  }
                </div>
              } @else {
                <p class="about-placeholder">
                  Configurez le contenu de cette page depuis
                  <strong>Administration → Personnalisation → Contenu du site</strong>.
                </p>
              }
              <div class="about-ctas">
                <a [routerLink]="['/portal/quote-request']" class="btn-primary"
                   [style.background]="b.primaryColor">
                  Demander un devis
                </a>
                <a [routerLink]="['/contact']" [queryParamsHandling]="'preserve'"
                   class="btn-outline" [style.border-color]="b.primaryColor" [style.color]="b.primaryColor">
                  Nous contacter
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Values / mission -->
      <section class="values-section" [style.background]="valuesBg()">
        <div class="container">
          <div class="section-header">
            <p class="section-eyebrow" [style.color]="b.primaryColor">Nos engagements</p>
            <h2 class="section-title">Ce qui nous distingue</h2>
          </div>
          <div class="values-grid">
            @for (v of values; track v.icon) {
              <div class="value-card">
                <div class="value-icon" [style.color]="b.primaryColor">{{ v.icon }}</div>
                <h3>{{ v.title }}</h3>
                <p>{{ v.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Contact CTA -->
      <section class="cta-strip" [style.background]="b.primaryColor">
        <div class="container cta-strip-inner">
          <h2>Travaillons ensemble</h2>
          <p>Une idée de projet ? Contactez-nous pour en discuter.</p>
          <a [routerLink]="['/contact']" [queryParamsHandling]="'preserve'" class="cta-strip-btn">
            Prendre contact
          </a>
        </div>
      </section>

    } @else {
      <div class="loading-screen">
        <div class="spinner"></div>
      </div>
    }
  `,
  styles: [`
    .page-hero {
      min-height: 52vh; position: relative;
      display: flex; align-items: center; justify-content: center;
    }
    .page-hero-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(135deg,rgba(0,0,0,.58) 0%,rgba(0,0,0,.32) 100%);
    }
    .page-hero-content {
      position: relative; z-index: 1; text-align: center;
      padding: 4rem 1.5rem; animation: fadeUp .6s ease both;
    }
    .eyebrow {
      font-size:.8rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
      color:rgba(255,255,255,.65); margin:0 0 .75rem;
    }
    .page-hero-content h1 {
      font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; color: #fff; margin: 0 0 1rem;
    }
    .hero-sub { color:rgba(255,255,255,.75); font-size:1.1rem; margin:0; }

    /* ── About section ── */
    .about-section { padding: 6rem 1.5rem; }
    .container     { max-width: 1200px; margin: 0 auto; }
    .about-layout  { display: grid; grid-template-columns: 1fr 1.5fr; gap: 5rem; align-items: start; }

    .about-visual { position: sticky; top: 100px; }
    .visual-card  {
      border: 1px solid; border-radius: 20px; overflow: hidden;
      background: #fff; padding: 2rem; position: relative;
    }
    .visual-logo  { width: 100%; max-height: 140px; object-fit: contain; margin-bottom: 1.5rem; }
    .visual-stats { display: flex; flex-direction: column; gap: .75rem; }
    .vs-item      {
      padding: 1rem; border: 1px solid; border-radius: 10px;
      display: flex; align-items: baseline; gap: .75rem;
    }
    .vs-value { font-size: 1.6rem; font-weight: 800; line-height: 1; }
    .vs-label { font-size: .82rem; color: #64748b; font-weight: 500; }
    .visual-accent {
      position: absolute; top: 0; left: 0; width: 100%; height: 4px;
    }

    .section-eyebrow {
      font-size: .78rem; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; display: block; margin-bottom: .75rem;
    }
    .about-heading { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0 0 1.5rem; }
    .about-body    { display: flex; flex-direction: column; gap: 1rem; }
    .about-body p  { font-size: 1rem; color: #475569; line-height: 1.85; margin: 0; }
    .about-placeholder { color: #94a3b8; font-style: italic; font-size: .95rem; }

    .about-ctas { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; }
    .btn-primary {
      display: inline-block; padding: .75rem 1.75rem; border-radius: 10px;
      font-size: .95rem; font-weight: 700; color: #fff; text-decoration: none;
      transition: opacity .2s, transform .2s;
    }
    .btn-primary:hover { opacity:.88; transform: translateY(-1px); }
    .btn-outline {
      display: inline-block; padding: .75rem 1.75rem; border-radius: 10px;
      font-size: .95rem; font-weight: 700; text-decoration: none; border: 2px solid;
      transition: background .2s, color .2s;
    }
    .btn-outline:hover { background: var(--pub-primary, #1976D2); color: #fff; border-color: var(--pub-primary, #1976D2); }

    /* ── Values ── */
    .values-section { padding: 6rem 1.5rem; }
    .section-header { text-align: center; margin-bottom: 3rem; }
    .section-title  { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; }
    .values-grid    {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }
    .value-card {
      text-align: center; padding: 2.5rem 1.5rem;
      background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
      transition: transform .25s, box-shadow .25s;
    }
    .value-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,.09); }
    .value-icon { font-size: 2.5rem; margin-bottom: 1rem; }
    .value-card h3 { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 .5rem; }
    .value-card p  { font-size: .875rem; color: #64748b; margin: 0; line-height: 1.7; }

    /* ── CTA strip ── */
    .cta-strip { padding: 5rem 1.5rem; text-align: center; }
    .cta-strip-inner h2 { font-size: 2rem; font-weight: 800; color: #fff; margin: 0 0 .75rem; }
    .cta-strip-inner p  { color: rgba(255,255,255,.8); margin: 0 0 2rem; font-size: 1.05rem; }
    .cta-strip-btn {
      display: inline-block; padding: .85rem 2.25rem; border-radius: 10px;
      background: #fff; font-size: 1rem; font-weight: 700; text-decoration: none;
      transition: transform .2s; box-shadow: 0 4px 18px rgba(0,0,0,.18);
    }
    .cta-strip-btn:hover { transform: translateY(-2px); }

    /* ── Loading ── */
    .loading-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; }
    .spinner {
      width:48px; height:48px; border:4px solid #e2e8f0;
      border-top-color: var(--pub-primary, #1976D2);
      border-radius:50%; animation: spin .8s linear infinite;
    }
    @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
    @keyframes spin   { to { transform: rotate(360deg); } }

    @media (max-width: 900px) {
      .about-layout { grid-template-columns: 1fr; }
      .about-visual { position: static; }
    }
  `],
})
export class AboutComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly pubBranding = inject(PublicBrandingService);

  get b(): BrandingResponse | null { return this.pubBranding.branding(); }

  readonly values = [
    { icon: '🏆', title: 'Excellence', desc: 'Nous visons la perfection dans chaque projet et chaque détail.' },
    { icon: '🤝', title: 'Confiance', desc: 'Des relations durables bâties sur la transparence et le respect.' },
    { icon: '⚡', title: 'Réactivité', desc: 'Des délais respectés et une communication fluide à chaque étape.' },
    { icon: '🌱', title: 'Innovation', desc: 'Des solutions modernes adaptées aux exigences de demain.' },
  ];

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('t');
    this.pubBranding.load(t);
  }

  paragraphs(): string[] {
    return (this.b?.aboutText || '').split('\n').filter(p => p.trim());
  }

  heroGradient(): string {
    const c1 = this.b?.primaryColor   || '#1976D2';
    const c2 = this.b?.secondaryColor || '#424242';
    return `background: linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  }

  valuesBg(): string {
    return `color-mix(in srgb, ${this.b?.primaryColor || '#1976D2'} 4%, #f8fafc)`;
  }
}
