import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { PublicBrandingService } from '../../core/services/public-branding.service';
import { BrandingResponse } from '../../core/services/cms.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- ── Sticky Navbar ──────────────────────────────────────────────────── -->
    <header class="pub-header" [class.scrolled]="scrolled()">
      <nav class="pub-nav">
        <!-- Brand -->
        <a [routerLink]="['/accueil']" [queryParamsHandling]="'preserve'" class="pub-brand">
          @if (b?.logoUrl) {
            <img [src]="b!.logoUrl" [alt]="b!.companyName" class="pub-logo">
          } @else {
            <span class="pub-logo-placeholder" [style.background]="b?.primaryColor || '#1976D2'">
              {{ (b?.companyName || 'E')[0].toUpperCase() }}
            </span>
          }
          <span class="pub-brand-name">{{ b?.companyName || 'Notre Entreprise' }}</span>
        </a>

        <!-- Desktop nav links -->
        <ul class="pub-links">
          <li><a [routerLink]="['/accueil']"     [queryParamsHandling]="'preserve'" routerLinkActive="active">Accueil</a></li>
          <li><a [routerLink]="['/a-propos']"    [queryParamsHandling]="'preserve'" routerLinkActive="active">À propos</a></li>
          <li><a [routerLink]="['/nos-services']"[queryParamsHandling]="'preserve'" routerLinkActive="active">Services</a></li>
          <li><a [routerLink]="['/galerie']"     [queryParamsHandling]="'preserve'" routerLinkActive="active">Galerie</a></li>
          <li><a [routerLink]="['/contact']"     [queryParamsHandling]="'preserve'" routerLinkActive="active">Contact</a></li>
        </ul>

        <!-- CTA buttons -->
        <div class="pub-actions">
          <button class="btn-login" (click)="login()">Se connecter</button>
          <a [routerLink]="['/portal/quote-request']" class="btn-devis"
             [style.background]="b?.primaryColor || '#1976D2'">
            {{ b?.heroCtaText || 'Demander un devis' }}
          </a>
        </div>

        <!-- Mobile hamburger -->
        <button class="pub-hamburger" (click)="mobileOpen.set(!mobileOpen())">
          <span></span><span></span><span></span>
        </button>
      </nav>

      <!-- Mobile menu -->
      @if (mobileOpen()) {
        <div class="pub-mobile-menu">
          <a [routerLink]="['/accueil']"      [queryParamsHandling]="'preserve'" (click)="mobileOpen.set(false)">Accueil</a>
          <a [routerLink]="['/a-propos']"     [queryParamsHandling]="'preserve'" (click)="mobileOpen.set(false)">À propos</a>
          <a [routerLink]="['/nos-services']" [queryParamsHandling]="'preserve'" (click)="mobileOpen.set(false)">Services</a>
          <a [routerLink]="['/galerie']"      [queryParamsHandling]="'preserve'" (click)="mobileOpen.set(false)">Galerie</a>
          <a [routerLink]="['/contact']"      [queryParamsHandling]="'preserve'" (click)="mobileOpen.set(false)">Contact</a>
          <hr style="border-color:rgba(255,255,255,.15);margin:.5rem 0">
          <button class="btn-login-mobile" (click)="login()">Se connecter</button>
          <a [routerLink]="['/portal/quote-request']" class="btn-devis-mobile"
             [style.background]="b?.primaryColor || '#1976D2'" (click)="mobileOpen.set(false)">
            {{ b?.heroCtaText || 'Demander un devis' }}
          </a>
        </div>
      }
    </header>

    <!-- ── Page content ───────────────────────────────────────────────────── -->
    <main class="pub-main">
      <router-outlet />
    </main>

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <footer class="pub-footer" [style.background]="footerBg()">
      <div class="pub-footer-inner">

        <!-- Brand column -->
        <div class="footer-brand">
          @if (b?.logoUrl) {
            <img [src]="b!.logoUrl" [alt]="b!.companyName" class="footer-logo">
          }
          <p class="footer-company">{{ b?.companyName || 'Notre Entreprise' }}</p>
          @if (b?.tagline) { <p class="footer-tagline">{{ b!.tagline }}</p> }
          @if (b?.siteDescription) { <p class="footer-desc">{{ b!.siteDescription }}</p> }
        </div>

        <!-- Nav column -->
        <div class="footer-col">
          <h4>Navigation</h4>
          <a [routerLink]="['/accueil']"      [queryParamsHandling]="'preserve'">Accueil</a>
          <a [routerLink]="['/a-propos']"     [queryParamsHandling]="'preserve'">À propos</a>
          <a [routerLink]="['/nos-services']" [queryParamsHandling]="'preserve'">Services</a>
          <a [routerLink]="['/galerie']"      [queryParamsHandling]="'preserve'">Galerie</a>
          <a [routerLink]="['/contact']"      [queryParamsHandling]="'preserve'">Contact</a>
        </div>

        <!-- Contact column -->
        <div class="footer-col">
          <h4>Contact</h4>
          @if (b?.contactEmail) {
            <a [href]="'mailto:' + b!.contactEmail">{{ b!.contactEmail }}</a>
          }
          @if (b?.contactPhone) {
            <a [href]="'tel:' + b!.contactPhone">{{ b!.contactPhone }}</a>
          }
          @if (b?.contactAddress) {
            <p style="margin:0;font-size:.85rem;opacity:.75;line-height:1.5">{{ b!.contactAddress }}</p>
          }
        </div>

        <!-- Social column -->
        <div class="footer-col">
          <h4>Suivez-nous</h4>
          <div class="footer-social">
            @if (b?.socialLinkedin) {
              <a [href]="b!.socialLinkedin!" target="_blank" rel="noopener" class="social-icon" title="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            }
            @if (b?.socialFacebook) {
              <a [href]="b!.socialFacebook!" target="_blank" rel="noopener" class="social-icon" title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z"/></svg>
              </a>
            }
            @if (b?.socialInstagram) {
              <a [href]="b!.socialInstagram!" target="_blank" rel="noopener" class="social-icon" title="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            }
            @if (b?.socialTwitter) {
              <a [href]="b!.socialTwitter!" target="_blank" rel="noopener" class="social-icon" title="X / Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            }
          </div>
          <a [routerLink]="['/portal/quote-request']" class="footer-cta"
             [style.background]="b?.primaryColor || '#1976D2'">
            Demander un devis
          </a>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ year }} {{ b?.companyName || 'Votre Entreprise' }}. Tous droits réservés.</span>
        <button class="footer-login" (click)="login()">Espace client</button>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      font-family: var(--pub-font, 'Inter, sans-serif');
    }

    /* ── Navbar ───────────────────────────────────────────────────────────── */
    .pub-header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      background: rgba(255,255,255,.96);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,.06);
      transition: box-shadow .25s;
    }
    .pub-header.scrolled { box-shadow: 0 2px 20px rgba(0,0,0,.10); }

    .pub-nav {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; gap: 2rem;
      padding: .875rem 1.5rem;
    }

    .pub-brand {
      display: flex; align-items: center; gap: .75rem;
      text-decoration: none; flex-shrink: 0;
    }
    .pub-logo         { height: 40px; width: auto; object-fit: contain; border-radius: 6px; }
    .pub-logo-placeholder {
      width: 40px; height: 40px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 1.1rem; flex-shrink: 0;
    }
    .pub-brand-name {
      font-weight: 700; font-size: 1.1rem; color: #0f172a;
      white-space: nowrap;
    }

    .pub-links {
      display: flex; align-items: center; gap: .25rem;
      list-style: none; margin: 0 auto; padding: 0;
    }
    .pub-links a {
      display: block; padding: .5rem .9rem;
      font-size: .9rem; font-weight: 500; color: #475569;
      text-decoration: none; border-radius: 8px;
      transition: color .2s, background .2s;
    }
    .pub-links a:hover, .pub-links a.active {
      color: var(--pub-primary, #1976D2);
      background: color-mix(in srgb, var(--pub-primary, #1976D2) 8%, transparent);
    }

    .pub-actions { display: flex; align-items: center; gap: .75rem; flex-shrink: 0; }

    .btn-login {
      padding: .5rem 1.1rem; border-radius: 8px; font-size: .875rem; font-weight: 600;
      border: 2px solid var(--pub-primary, #1976D2);
      color: var(--pub-primary, #1976D2);
      background: transparent; cursor: pointer;
      transition: background .2s, color .2s;
    }
    .btn-login:hover { background: var(--pub-primary, #1976D2); color: #fff; }

    .btn-devis {
      padding: .5rem 1.25rem; border-radius: 8px; font-size: .875rem; font-weight: 600;
      color: #fff; text-decoration: none;
      box-shadow: 0 2px 8px rgba(0,0,0,.18);
      transition: opacity .2s, transform .15s;
      display: inline-block;
    }
    .btn-devis:hover { opacity: .88; transform: translateY(-1px); }

    .pub-hamburger {
      display: none; flex-direction: column; gap: 5px;
      background: none; border: none; cursor: pointer; padding: .5rem; margin-left: auto;
    }
    .pub-hamburger span {
      display: block; width: 22px; height: 2px;
      background: #475569; border-radius: 2px; transition: .3s;
    }

    /* Mobile menu */
    .pub-mobile-menu {
      display: flex; flex-direction: column; gap: .5rem;
      padding: 1rem 1.5rem 1.5rem;
      background: #1e293b;
      border-top: 1px solid rgba(255,255,255,.08);
    }
    .pub-mobile-menu a {
      color: rgba(255,255,255,.85); text-decoration: none;
      font-size: 1rem; font-weight: 500; padding: .6rem 0;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .btn-login-mobile {
      margin-top: .5rem; padding: .6rem 1rem; border-radius: 8px; font-size: .9rem; font-weight: 600;
      border: 2px solid rgba(255,255,255,.4); color: rgba(255,255,255,.9);
      background: transparent; cursor: pointer;
    }
    .btn-devis-mobile {
      display: block; margin-top: .5rem; padding: .7rem 1rem;
      border-radius: 8px; font-size: .9rem; font-weight: 600;
      color: #fff; text-decoration: none; text-align: center;
    }

    /* ── Main ─────────────────────────────────────────────────────────────── */
    .pub-main { flex: 1; padding-top: 72px; }

    /* ── Footer ───────────────────────────────────────────────────────────── */
    .pub-footer { color: rgba(255,255,255,.85); padding: 4rem 1.5rem 0; }
    .pub-footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem;
    }
    .footer-brand { display: flex; flex-direction: column; gap: .6rem; }
    .footer-logo  { height: 48px; width: auto; object-fit: contain; border-radius: 6px; opacity: .9; }
    .footer-company { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0; }
    .footer-tagline { font-size: .85rem; opacity: .6; margin: 0; }
    .footer-desc    { font-size: .82rem; opacity: .55; margin: 0; line-height: 1.6; max-width: 280px; }

    .footer-col { display: flex; flex-direction: column; gap: .6rem; }
    .footer-col h4 {
      font-size: .75rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: rgba(255,255,255,.4); margin: 0 0 .5rem;
    }
    .footer-col a {
      color: rgba(255,255,255,.7); text-decoration: none; font-size: .875rem;
      transition: color .2s;
    }
    .footer-col a:hover { color: #fff; }

    .footer-social { display: flex; gap: .75rem; margin-bottom: .5rem; }
    .social-icon {
      width: 36px; height: 36px; border-radius: 8px;
      background: rgba(255,255,255,.1); display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,.75); transition: background .2s, color .2s; text-decoration: none;
    }
    .social-icon:hover { background: rgba(255,255,255,.2); color: #fff; }
    .social-icon svg  { width: 16px; height: 16px; }

    .footer-cta {
      display: inline-block; padding: .6rem 1.1rem; border-radius: 8px;
      font-size: .85rem; font-weight: 600; color: #fff; text-decoration: none;
      transition: opacity .2s; margin-top: .25rem;
    }
    .footer-cta:hover { opacity: .85; }

    .footer-bottom {
      max-width: 1200px; margin: 3rem auto 0;
      padding: 1.25rem 0;
      border-top: 1px solid rgba(255,255,255,.1);
      display: flex; justify-content: space-between; align-items: center;
      font-size: .8rem; color: rgba(255,255,255,.4);
    }
    .footer-login {
      background: none; border: 1px solid rgba(255,255,255,.2); border-radius: 6px;
      color: rgba(255,255,255,.5); font-size: .8rem; padding: .3rem .75rem; cursor: pointer;
      transition: border-color .2s, color .2s;
    }
    .footer-login:hover { border-color: rgba(255,255,255,.5); color: rgba(255,255,255,.8); }

    /* ── Responsive ───────────────────────────────────────────────────────── */
    @media (max-width: 900px) {
      .pub-links, .pub-actions { display: none; }
      .pub-hamburger { display: flex; }
      .pub-footer-inner { grid-template-columns: 1fr 1fr; gap: 2rem; }
    }
    @media (max-width: 540px) {
      .pub-footer-inner { grid-template-columns: 1fr; }
      .footer-bottom { flex-direction: column; gap: .75rem; text-align: center; }
    }
  `],
})
export class PublicLayoutComponent implements OnInit, OnDestroy {
  private readonly route  = inject(ActivatedRoute);
  private readonly oidc   = inject(OidcSecurityService);
  readonly pubBranding    = inject(PublicBrandingService);

  readonly mobileOpen = signal(false);
  readonly scrolled   = signal(false);
  readonly year       = new Date().getFullYear();

  private readonly onScroll = () => this.scrolled.set(window.scrollY > 20);

  get b(): BrandingResponse | null { return this.pubBranding.branding(); }

  footerBg(): string {
    const c = this.b?.primaryColor || '#1976D2';
    return `color-mix(in srgb, ${c} 20%, #0f172a)`;
  }

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('t');
    this.pubBranding.load(t);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  login(): void { this.oidc.authorize(); }
}
