import { Injectable, inject, signal } from '@angular/core';
import { CmsService, BrandingResponse } from './cms.service';

const DEFAULT_BRANDING: BrandingResponse = {
  id:             '',
  companyName:    'ERP Platform',
  tagline:        'Solution ERP pour menuiserie aluminium',
  logoUrl:        null,
  faviconUrl:     null,
  primaryColor:   '#1976D2',
  secondaryColor: '#424242',
  fontFamily:     'Inter, sans-serif',
  customCss:      null,
  updatedAt:      '',
  heroTitle:      'Bienvenue',
  heroSubtitle:   'Contactez-nous pour découvrir nos services.',
  heroCtaText:    'Demander un devis',
};

function applyPublicBrandingVars(b: BrandingResponse) {
  const root = document.documentElement;
  if (b.primaryColor)   root.style.setProperty('--pub-primary',   b.primaryColor);
  if (b.secondaryColor) root.style.setProperty('--pub-secondary', b.secondaryColor);
  if (b.fontFamily)     root.style.setProperty('--pub-font',      b.fontFamily);
  if (b.customCss) {
    let s = document.getElementById('pub-custom-css') as HTMLStyleElement;
    if (!s) { s = document.createElement('style'); s.id = 'pub-custom-css'; document.head.appendChild(s); }
    s.textContent = b.customCss;
  }
  if (b.companyName) document.title = b.companyName;
}

/**
 * Singleton that loads and caches branding for the public site.
 * When no tenantId is provided, falls back to a default branding object
 * rather than calling an authenticated endpoint (which would 401 for guests).
 */
@Injectable({ providedIn: 'root' })
export class PublicBrandingService {
  private readonly cms = inject(CmsService);

  private loadedFor: string | null | undefined = undefined;

  readonly branding = signal<BrandingResponse | null>(null);
  readonly loading  = signal(false);

  load(tenantId: string | null): void {
    if (this.loadedFor === tenantId && this.branding() !== null) return;

    if (!tenantId) {
      this.branding.set(DEFAULT_BRANDING);
      this.loadedFor = null;
      applyPublicBrandingVars(DEFAULT_BRANDING);
      return;
    }

    this.loading.set(true);
    this.cms.getPublicBranding(tenantId).subscribe({
      next: b => {
        this.branding.set(b);
        this.loadedFor = tenantId;
        this.loading.set(false);
        applyPublicBrandingVars(b);
      },
      error: () => {
        this.branding.set(DEFAULT_BRANDING);
        this.loadedFor = tenantId;
        this.loading.set(false);
      },
    });
  }

  /** Force a reload (called after branding update in admin). */
  invalidate(): void {
    this.loadedFor = undefined;
    this.branding.set(null);
  }
}
