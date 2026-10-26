import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicBrandingService } from '../../../core/services/public-branding.service';
import { BrandingResponse, GalleryItem } from '../../../core/services/cms.service';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [],
  template: `
    @if (b) {
      <!-- Page hero -->
      <section class="page-hero" [style]="heroGradient()">
        <div class="page-hero-overlay"></div>
        <div class="page-hero-content">
          <p class="eyebrow">Nos réalisations</p>
          <h1>Galerie de projets</h1>
          @if (b.tagline) { <p class="hero-sub">{{ b.tagline }}</p> }
        </div>
      </section>

      <!-- Gallery grid -->
      <section class="gallery-section">
        <div class="container">
          @if (gallery.length) {
            <div class="gallery-masonry">
              @for (img of gallery; track img.fid; let i = $index) {
                <div class="gallery-item" (click)="openLightbox(i)">
                  <img [src]="img.url" [alt]="img.alt || img.caption"
                       loading="lazy" onerror="this.parentElement.style.display='none'">
                  <div class="gallery-item-overlay">
                    <svg class="zoom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                    </svg>
                    @if (img.caption) {
                      <p class="overlay-caption">{{ img.caption }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-gallery">
              <div class="empty-icon" [style.color]="b.primaryColor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                </svg>
              </div>
              <h3>Galerie en cours de construction</h3>
              <p>Les photos de nos réalisations seront disponibles très prochainement.</p>
            </div>
          }
        </div>
      </section>

      <!-- Lightbox -->
      @if (lightboxIndex() !== null) {
        <div class="lightbox-backdrop" (click)="closeLightbox()">
          <button class="lb-close" (click)="closeLightbox()">✕</button>

          @if (lightboxIndex()! > 0) {
            <button class="lb-arrow lb-prev" (click)="$event.stopPropagation(); prevImage()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
              </svg>
            </button>
          }

          <div class="lb-content" (click)="$event.stopPropagation()">
            <img [src]="gallery[lightboxIndex()!].url"
                 [alt]="gallery[lightboxIndex()!].alt || gallery[lightboxIndex()!].caption"
                 class="lb-img">
            @if (gallery[lightboxIndex()!].caption) {
              <p class="lb-caption">{{ gallery[lightboxIndex()!].caption }}</p>
            }
            <p class="lb-counter">{{ lightboxIndex()! + 1 }} / {{ gallery.length }}</p>
          </div>

          @if (lightboxIndex()! < gallery.length - 1) {
            <button class="lb-arrow lb-next" (click)="$event.stopPropagation(); nextImage()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            </button>
          }
        </div>
      }

    } @else {
      <div class="loading-screen">
        <div class="spinner"></div>
      </div>
    }
  `,
  styles: [`
    .page-hero {
      min-height: 48vh; position: relative;
      display: flex; align-items: center; justify-content: center;
    }
    .page-hero-overlay {
      position:absolute;inset:0;
      background:linear-gradient(135deg,rgba(0,0,0,.58) 0%,rgba(0,0,0,.32) 100%);
    }
    .page-hero-content {
      position:relative;z-index:1;text-align:center;
      padding:4rem 1.5rem; animation: fadeUp .6s ease both;
    }
    .eyebrow {
      font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
      color:rgba(255,255,255,.65);margin:0 0 .75rem;
    }
    .page-hero-content h1 {
      font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:#fff;margin:0 0 .75rem;
    }
    .hero-sub { color:rgba(255,255,255,.75);font-size:1.05rem;margin:0; }

    /* ── Gallery ── */
    .gallery-section { padding: 4rem 1.5rem 6rem; }
    .container       { max-width: 1200px; margin: 0 auto; }

    .gallery-masonry {
      columns: 3; column-gap: 1rem;
    }
    .gallery-item {
      break-inside: avoid; margin-bottom: 1rem;
      border-radius: 12px; overflow: hidden; cursor: pointer;
      position: relative; background: #e2e8f0;
    }
    .gallery-item img {
      width: 100%; display: block;
      transition: transform .4s ease;
    }
    .gallery-item:hover img { transform: scale(1.04); }
    .gallery-item-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(transparent 50%, rgba(0,0,0,.6));
      opacity: 0; transition: opacity .3s;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .gallery-item:hover .gallery-item-overlay { opacity: 1; }
    .zoom-icon { width: 32px; height: 32px; color: #fff; margin-bottom: .5rem; }
    .overlay-caption {
      color: #fff; font-size: .8rem; font-weight: 500; text-align: center;
      padding: 0 1rem; position: absolute; bottom: 1rem; left: 0; right: 0;
    }

    /* ── Empty state ── */
    .empty-gallery {
      text-align: center; padding: 6rem 1.5rem;
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
    }
    .empty-icon svg { width: 64px; height: 64px; }
    .empty-gallery h3 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
    .empty-gallery p  { color: #64748b; margin: 0; }

    /* ── Lightbox ── */
    .lightbox-backdrop {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,.92); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn .2s ease;
    }
    .lb-close {
      position: absolute; top: 1.5rem; right: 1.5rem;
      background: rgba(255,255,255,.15); border: none; color: #fff;
      font-size: 1.25rem; width: 44px; height: 44px; border-radius: 50%;
      cursor: pointer; transition: background .2s;
    }
    .lb-close:hover { background: rgba(255,255,255,.3); }
    .lb-arrow {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(255,255,255,.15); border: none; color: #fff;
      width: 52px; height: 52px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    .lb-arrow:hover { background: rgba(255,255,255,.3); }
    .lb-arrow svg { width: 24px; height: 24px; }
    .lb-prev { left: 1.5rem; }
    .lb-next { right: 1.5rem; }
    .lb-content { max-width: 90vw; max-height: 90vh; text-align: center; }
    .lb-img {
      max-width: 100%; max-height: 80vh; object-fit: contain;
      border-radius: 12px; box-shadow: 0 24px 80px rgba(0,0,0,.4);
    }
    .lb-caption { color: rgba(255,255,255,.8); margin: .75rem 0 0; font-size: .9rem; }
    .lb-counter { color: rgba(255,255,255,.4); margin: .4rem 0 0; font-size: .8rem; }

    /* ── Loading ── */
    .loading-screen { min-height:100vh;display:flex;align-items:center;justify-content:center; }
    .spinner {
      width:48px;height:48px;border:4px solid #e2e8f0;
      border-top-color:var(--pub-primary,#1976D2);
      border-radius:50%;animation:spin .8s linear infinite;
    }

    @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes spin   { to{transform:rotate(360deg)} }

    @media (max-width: 900px) {
      .gallery-masonry { columns: 2; }
      .lb-prev { left: .5rem; }
      .lb-next { right: .5rem; }
    }
    @media (max-width: 540px) {
      .gallery-masonry { columns: 1; }
    }
  `],
})
export class GalleryComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly pubBranding = inject(PublicBrandingService);

  readonly lightboxIndex = signal<number | null>(null);

  get b(): BrandingResponse | null { return this.pubBranding.branding(); }
  get gallery(): GalleryItem[] { return this.b?.gallery ?? []; }

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('t');
    this.pubBranding.load(t);
  }

  heroGradient(): string {
    const c1 = this.b?.primaryColor   || '#1976D2';
    const c2 = this.b?.secondaryColor || '#424242';
    return `background: linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  }

  openLightbox(i: number): void { this.lightboxIndex.set(i); }
  closeLightbox(): void          { this.lightboxIndex.set(null); }
  prevImage(): void { this.lightboxIndex.update(i => (i ?? 1) - 1); }
  nextImage(): void { this.lightboxIndex.update(i => (i ?? 0) + 1); }
}
