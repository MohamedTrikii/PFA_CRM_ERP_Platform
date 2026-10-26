import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CmsService, BrandingResponse, GalleryItem, ServiceItem, StatItem } from '../../../core/services/cms.service';
import { AuthContextService } from '../../../core/services/auth-context.service';
import { PublicBrandingService } from '../../../core/services/public-branding.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

export function applyBrandingCssVars(b: BrandingResponse) {
  const root = document.documentElement;
  if (b.primaryColor)   root.style.setProperty('--brand-primary',   b.primaryColor);
  if (b.secondaryColor) root.style.setProperty('--brand-secondary', b.secondaryColor);
  if (b.fontFamily)     root.style.setProperty('--brand-font',      b.fontFamily);
  if (b.customCss) {
    let style = document.getElementById('brand-custom-css') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'brand-custom-css'; document.head.appendChild(style); }
    style.textContent = b.customCss;
  }
  if (b.companyName) document.title = b.companyName + ' – ERP';
}

@Component({
  selector: 'app-branding-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div class="page-header">
      <h2>Personnalisation du site</h2>
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        @if (authCtx.isSuperAdmin()) {
          <label style="display:flex;align-items:center;gap:.5rem;font-size:.875rem;font-weight:500">
            Tenant&nbsp;:
            <select (change)="onTenantChange($any($event.target).value)"
                    style="padding:.35rem .6rem;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:.875rem">
              <option value="" disabled [selected]="!selectedTenantId">— choisir —</option>
              @for (t of authCtx.tenants(); track t.id) {
                <option [value]="t.id" [selected]="t.id === selectedTenantId">
                  {{ t.name }} ({{ t.slug }})
                </option>
              }
            </select>
          </label>
        }
        @if (selectedTenantId) {
          <a [href]="'/accueil?t=' + selectedTenantId" target="_blank" class="btn-preview">
            👁 Aperçu du site public
          </a>
        }
      </div>
    </div>

    <!-- ── Tabs ── -->
    <div class="tabs-bar">
      @for (tab of tabs; track tab.id) {
        <button class="tab-btn" [class.active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
          {{ tab.label }}
        </button>
      }
    </div>

    <!-- ═══ TAB 1: APPARENCE ═══ -->
    @if (activeTab() === 'appearance') {
      <div class="tab-content">
        <div class="settings-grid">
          <!-- Preview -->
          <div class="preview-card">
            <div class="preview-header"
                 [style.background]="form.value.primaryColor || '#1976D2'"
                 [style.color]="'white'"
                 [style.font-family]="form.value.fontFamily || 'Inter, sans-serif'">
              <img *ngIf="logoPreview || branding?.logoUrl"
                   [src]="logoPreview || branding?.logoUrl"
                   alt="Logo" class="preview-logo">
              <div>
                <div class="preview-name">{{ form.value.companyName || 'Nom de l\'entreprise' }}</div>
                <div class="preview-tagline">{{ form.value.tagline || 'Votre tagline ici' }}</div>
              </div>
            </div>
            <div class="preview-body">
              <div class="preview-nav" [style.color]="form.value.primaryColor || '#1976D2'">Navigation</div>
              <div class="preview-content">Contenu principal</div>
              <div class="preview-btn" [style.background]="form.value.primaryColor || '#1976D2'">Demander un devis</div>
            </div>
          </div>

          <!-- Form -->
          <div class="form-panel">
            <form [formGroup]="form">
              <fieldset>
                <legend>Identité</legend>
                <label>Nom de l'entreprise
                  <input formControlName="companyName" placeholder="AluminiumPro SARL">
                </label>
                <label>Tagline
                  <input formControlName="tagline" placeholder="Expert en menuiserie aluminium">
                </label>
              </fieldset>
              <fieldset>
                <legend>Couleurs</legend>
                <div class="color-row">
                  <label>Couleur principale
                    <div class="color-input-wrap">
                      <input type="color" formControlName="primaryColor" class="color-picker">
                      <input formControlName="primaryColor" placeholder="#1976D2" class="color-hex">
                    </div>
                  </label>
                  <label>Couleur secondaire
                    <div class="color-input-wrap">
                      <input type="color" formControlName="secondaryColor" class="color-picker">
                      <input formControlName="secondaryColor" placeholder="#424242" class="color-hex">
                    </div>
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Typographie</legend>
                <label>Police
                  <select formControlName="fontFamily">
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Poppins, sans-serif">Poppins</option>
                    <option value="Montserrat, sans-serif">Montserrat</option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                  </select>
                </label>
              </fieldset>
              <fieldset>
                <legend>Logo</legend>
                <div class="logo-upload">
                  @if (branding?.logoUrl) {
                    <img [src]="branding!.logoUrl" alt="Logo actuel" class="current-logo">
                  }
                  <label class="upload-btn">
                    Choisir un logo (PNG/SVG, max 2 Mo)
                    <input type="file" accept="image/png,image/svg+xml,image/webp"
                           (change)="onLogoSelected($event)" hidden>
                  </label>
                  @if (logoFile) {
                    <span class="file-name">{{ logoFile.name }}</span>
                    <button type="button" class="btn-sm btn-success" (click)="uploadLogo()" [disabled]="uploadingLogo">
                      {{ uploadingLogo ? 'Upload…' : 'Uploader' }}
                    </button>
                  }
                </div>
              </fieldset>
              <fieldset>
                <legend>CSS personnalisé (avancé)</legend>
                <textarea formControlName="customCss" rows="5"
                          placeholder=":root { --brand-radius: 8px; }"></textarea>
              </fieldset>
            </form>
            <button class="btn-primary" (click)="saveAppearance()"
                    [disabled]="form.invalid || saving || (authCtx.isSuperAdmin() && !selectedTenantId)">
              {{ saving ? 'Enregistrement…' : 'Enregistrer l\'apparence' }}
            </button>
          </div>
        </div>

        <!-- Notices -->
        <div class="section-divider">
          <h3>Annonces aux utilisateurs</h3>
          <button class="btn-primary" (click)="showNoticeForm = true">+ Nouvelle annonce</button>
        </div>
        <div class="notices-list">
          @for (n of notices; track n.id) {
            <div class="notice-card" [class]="'notice-' + n.severity.toLowerCase()">
              <div class="notice-info">
                <span class="notice-severity">{{ n.severity }}</span>
                <span class="notice-title">{{ n.title }}</span>
                <span class="notice-status" [class]="n.active ? 'chip-green' : 'chip-gray'">
                  {{ n.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <button class="btn-danger-sm" (click)="deleteNotice(n.id)">Supprimer</button>
            </div>
          }
        </div>
        @if (showNoticeForm) {
          <div class="modal-backdrop" (click)="showNoticeForm = false">
            <div class="modal" (click)="$event.stopPropagation()">
              <h3>Nouvelle annonce</h3>
              <form [formGroup]="noticeForm" (ngSubmit)="createNotice()">
                <label>Titre *<input formControlName="title" placeholder="Maintenance programmée"></label>
                <label>Contenu<textarea formControlName="body" rows="3" placeholder="Le système sera indisponible le..."></textarea></label>
                <label>Niveau
                  <select formControlName="severity">
                    <option value="INFO">Information</option>
                    <option value="WARNING">Avertissement</option>
                    <option value="ERROR">Critique</option>
                  </select>
                </label>
                <div class="form-actions">
                  <button type="button" class="btn-secondary" (click)="showNoticeForm = false">Annuler</button>
                  <button type="submit" class="btn-primary" [disabled]="noticeForm.invalid">Publier</button>
                </div>
              </form>
            </div>
          </div>
        }
      </div>
    }

    <!-- ═══ TAB 2: CONTENU DU SITE ═══ -->
    @if (activeTab() === 'content') {
      <div class="tab-content">

        <!-- Hero -->
        <fieldset>
          <legend>Section Hero (page d'accueil)</legend>
          <label>Titre principal du hero
            <input [formControl]="contentForm.controls.heroTitle"
                   placeholder="Experts en menuiserie aluminium depuis 2005">
          </label>
          <label>Sous-titre
            <input [formControl]="contentForm.controls.heroSubtitle"
                   placeholder="Fenêtres, portes, vérandas… nous réalisons tous vos projets.">
          </label>
          <label>Texte du bouton CTA
            <input [formControl]="contentForm.controls.heroCtaText" placeholder="Demander un devis">
          </label>
        </fieldset>

        <!-- About -->
        <fieldset>
          <legend>Section À propos</legend>
          <label>Titre
            <input [formControl]="contentForm.controls.aboutTitle" placeholder="Notre histoire">
          </label>
          <label>Texte (séparez les paragraphes par des sauts de ligne)
            <textarea [formControl]="contentForm.controls.aboutText" rows="6"
                      placeholder="Fondée en 2005, notre entreprise..."></textarea>
          </label>
          <label>Description SEO / meta
            <textarea [formControl]="contentForm.controls.siteDescription" rows="2"
                      placeholder="Courte description pour les moteurs de recherche"></textarea>
          </label>
        </fieldset>

        <!-- Stats -->
        <fieldset>
          <legend>Chiffres clés</legend>
          <div [formGroup]="contentForm">
            <div formArrayName="stats">
              @for (sg of statsControls; track sg; let i = $index) {
                <div class="array-row" [formGroup]="sg">
                  <input formControlName="label" placeholder="Projets réalisés" class="flex1">
                  <input formControlName="value" placeholder="500+" style="width:100px">
                  <button type="button" class="btn-danger-sm" (click)="removeStat(i)">✕</button>
                </div>
              }
            </div>
          </div>
          <button type="button" class="btn-add" (click)="addStat()">+ Ajouter un chiffre</button>
        </fieldset>

        <!-- Services -->
        <fieldset>
          <legend>Services proposés</legend>
          <div [formGroup]="contentForm">
            <div formArrayName="services">
              @for (sg of servicesControls; track sg; let i = $index) {
                <div class="service-editor" [formGroup]="sg">
                  <div class="service-editor-row">
                    <input formControlName="icon"  placeholder="🏠 emoji ou symbole" style="width:90px">
                    <input formControlName="title" placeholder="Titre du service" class="flex1">
                    <button type="button" class="btn-danger-sm" (click)="removeService(i)">✕</button>
                  </div>
                  <textarea formControlName="description" rows="2"
                            placeholder="Description du service…"></textarea>
                </div>
              }
            </div>
          </div>
          <button type="button" class="btn-add" (click)="addService()">+ Ajouter un service</button>
        </fieldset>

        <button class="btn-primary" style="margin-top:1rem" (click)="saveContent()"
                [disabled]="savingContent || (authCtx.isSuperAdmin() && !selectedTenantId)">
          {{ savingContent ? 'Enregistrement…' : 'Enregistrer le contenu' }}
        </button>
      </div>
    }

    <!-- ═══ TAB 3: GALERIE ═══ -->
    @if (activeTab() === 'gallery') {
      <div class="tab-content">
        <div class="gallery-instructions">
          <p>Uploadez les photos de vos réalisations. Elles apparaîtront sur les pages publiques Galerie et Accueil.</p>
        </div>

        <!-- Upload zone -->
        <div class="upload-zone" (click)="galleryFileInput.click()"
             [class.drag-over]="dragOver()"
             (dragover)="$event.preventDefault(); dragOver.set(true)"
             (dragleave)="dragOver.set(false)"
             (drop)="onGalleryDrop($event)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.042 11.095H6.75z"/>
          </svg>
          <p>Cliquez ou glissez-déposez vos images</p>
          <span>PNG, JPG, WebP — max 5 Mo</span>
          <input #galleryFileInput type="file" accept="image/*" multiple hidden
                 (change)="onGalleryFilesSelected($event)">
        </div>

        <!-- Pending uploads -->
        @if (pendingGalleryFiles.length) {
          <div class="pending-uploads">
            <h4>À uploader ({{ pendingGalleryFiles.length }} fichier(s))</h4>
            <div class="pending-grid">
              @for (pf of pendingGalleryFiles; track pf.name; let i = $index) {
                <div class="pending-item">
                  <img [src]="pf.preview" [alt]="pf.name" class="pending-thumb">
                  <input [value]="pf.caption" (input)="pf.caption = $any($event.target).value"
                         placeholder="Légende (optionnel)" class="pending-caption">
                  <button type="button" class="btn-danger-sm" (click)="pendingGalleryFiles.splice(i,1)">✕</button>
                </div>
              }
            </div>
            <button class="btn-primary" (click)="uploadAllGalleryImages()" [disabled]="uploadingGallery">
              {{ uploadingGallery ? 'Upload en cours…' : 'Tout uploader' }}
            </button>
          </div>
        }

        <!-- Existing gallery -->
        @if (gallery.length) {
          <div class="gallery-section-header">
            <h4>Images de la galerie ({{ gallery.length }})</h4>
          </div>
          <div class="gallery-admin-grid">
            @for (img of gallery; track img.fid) {
              <div class="gallery-admin-item">
                <img [src]="img.url" [alt]="img.caption"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e2e8f0%22 width=%22100%22 height=%22100%22/></svg>'">
                @if (img.caption) { <p class="gallery-item-caption">{{ img.caption }}</p> }
                <button class="gallery-delete-btn" (click)="deleteGalleryImage(img.fid)"
                        title="Supprimer cette image">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                  </svg>
                </button>
              </div>
            }
          </div>
        } @else if (!pendingGalleryFiles.length) {
          <p class="empty-hint">Aucune image dans la galerie. Commencez par en uploader quelques-unes.</p>
        }
      </div>
    }

    <!-- ═══ TAB 4: CONTACT & RÉSEAUX ═══ -->
    @if (activeTab() === 'contact') {
      <div class="tab-content">
        <div class="two-col">
          <!-- Contact info -->
          <fieldset>
            <legend>Informations de contact</legend>
            <label>Email
              <input [formControl]="contactForm.controls.contactEmail"
                     type="email" placeholder="contact@entreprise.fr">
            </label>
            <label>Téléphone
              <input [formControl]="contactForm.controls.contactPhone"
                     type="tel" placeholder="+33 6 00 00 00 00">
            </label>
            <label>Adresse (peut être multiligne)
              <textarea [formControl]="contactForm.controls.contactAddress"
                        rows="3" placeholder="12 rue Exemple&#10;75000 Paris"></textarea>
            </label>
          </fieldset>

          <!-- Social links -->
          <fieldset>
            <legend>Réseaux sociaux</legend>
            <label>LinkedIn
              <input [formControl]="contactForm.controls.socialLinkedin"
                     placeholder="https://linkedin.com/company/...">
            </label>
            <label>Facebook
              <input [formControl]="contactForm.controls.socialFacebook"
                     placeholder="https://facebook.com/...">
            </label>
            <label>Instagram
              <input [formControl]="contactForm.controls.socialInstagram"
                     placeholder="https://instagram.com/...">
            </label>
            <label>X / Twitter
              <input [formControl]="contactForm.controls.socialTwitter"
                     placeholder="https://x.com/...">
            </label>
          </fieldset>
        </div>

        <button class="btn-primary" style="margin-top:1rem" (click)="saveContact()"
                [disabled]="savingContact || (authCtx.isSuperAdmin() && !selectedTenantId)">
          {{ savingContact ? 'Enregistrement…' : 'Enregistrer les coordonnées' }}
        </button>
      </div>
    }
  `,
  styles: [`
    .tabs-bar {
      display: flex; gap: .25rem; border-bottom: 2px solid var(--border, #e2e8f0);
      margin-bottom: 1.75rem; padding-bottom: 0;
    }
    .tab-btn {
      padding: .65rem 1.25rem; font-size: .875rem; font-weight: 600;
      border: none; background: none; cursor: pointer; color: #64748b;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      border-radius: 6px 6px 0 0; transition: color .2s, border-color .2s;
    }
    .tab-btn.active { color: var(--brand-primary, #1976D2); border-bottom-color: var(--brand-primary, #1976D2); }
    .tab-btn:hover:not(.active) { color: #334155; background: #f8fafc; }

    .tab-content { animation: fadeIn .2s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

    .btn-preview {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .4rem 1rem; border-radius: 6px; font-size: .82rem; font-weight: 600;
      background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
      text-decoration: none; transition: background .2s;
    }
    .btn-preview:hover { background: #dcfce7; }

    /* ── Appearance tab (existing styles preserved) ── */
    .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem; }
    .preview-card  { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .preview-header{ padding: 1.5rem; display: flex; gap: 1rem; align-items: center; }
    .preview-logo  { height: 48px; width: auto; border-radius: 4px; background: rgba(255,255,255,.2); }
    .preview-name  { font-size: 1.1rem; font-weight: 700; }
    .preview-tagline { font-size: .85rem; opacity: .85; }
    .preview-body  { padding: 1rem; background: var(--surface); }
    .preview-nav   { font-weight: 600; margin-bottom: .5rem; }
    .preview-content { color: var(--text-secondary); font-size: .9rem; margin-bottom: .75rem; }
    .preview-btn   { display: inline-block; padding: .4rem .9rem; border-radius: 6px; color: #fff; font-size: .8rem; font-weight: 700; }
    .form-panel    { display: flex; flex-direction: column; gap: 1rem; }
    fieldset       { border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
    legend         { font-weight: 600; padding: 0 .5rem; font-size: .9rem; }
    .color-row     { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .color-input-wrap { display: flex; gap: .5rem; align-items: center; }
    .color-picker  { width: 40px; height: 34px; border: none; cursor: pointer; padding: 0; }
    .color-hex     { flex: 1; }
    .logo-upload   { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .current-logo  { height: 48px; width: auto; border-radius: 4px; }
    .upload-btn    { cursor: pointer; padding: .5rem 1rem; border: 1px dashed var(--border); border-radius: 6px; font-size: .9rem; }
    .file-name     { font-size: .85rem; color: var(--text-secondary); }
    .section-divider { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
    .notice-card   { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-radius: 8px; margin-bottom: .5rem; background: var(--surface); border-left: 4px solid; }
    .notice-info   { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
    .notice-severity { font-weight: 700; font-size: .75rem; text-transform: uppercase; }

    /* ── Content tab ── */
    .array-row { display: flex; gap: .5rem; align-items: center; margin-bottom: .5rem; }
    .flex1     { flex: 1; }
    .btn-add   {
      margin-top: .5rem; padding: .4rem .9rem; border-radius: 6px; font-size: .82rem;
      font-weight: 600; border: 1px dashed var(--border, #e2e8f0);
      background: transparent; cursor: pointer; color: #475569;
      transition: border-color .2s, color .2s;
    }
    .btn-add:hover { border-color: var(--brand-primary, #1976D2); color: var(--brand-primary, #1976D2); }

    .service-editor {
      border: 1px solid var(--border, #e2e8f0); border-radius: 8px;
      padding: .75rem; margin-bottom: .75rem;
      display: flex; flex-direction: column; gap: .5rem;
    }
    .service-editor-row { display: flex; gap: .5rem; align-items: center; }

    /* ── Gallery tab ── */
    .gallery-instructions { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: .75rem 1rem; margin-bottom: 1.5rem; }
    .gallery-instructions p { margin: 0; font-size: .875rem; color: #0369a1; }

    .upload-zone {
      border: 2px dashed var(--border, #e2e8f0); border-radius: 12px;
      padding: 3rem 1.5rem; text-align: center; cursor: pointer;
      transition: border-color .2s, background .2s; margin-bottom: 1.5rem;
    }
    .upload-zone:hover, .upload-zone.drag-over {
      border-color: var(--brand-primary, #1976D2);
      background: color-mix(in srgb, var(--brand-primary, #1976D2) 5%, transparent);
    }
    .upload-zone svg { width: 40px; height: 40px; color: #94a3b8; margin-bottom: .75rem; }
    .upload-zone p   { font-size: .95rem; font-weight: 600; color: #475569; margin: 0 0 .25rem; }
    .upload-zone span { font-size: .8rem; color: #94a3b8; }

    .pending-uploads { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .pending-uploads h4 { margin: 0 0 1rem; font-size: .9rem; font-weight: 700; }
    .pending-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 1rem; margin-bottom: 1rem; }
    .pending-item { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; }
    .pending-thumb { width: 100%; height: 140px; object-fit: cover; display: block; }
    .pending-caption { width: 100%; border: none; border-top: 1px solid #e2e8f0; padding: .5rem; font-size: .8rem; font-family: inherit; outline: none; box-sizing: border-box; }

    .gallery-section-header { margin-bottom: 1rem; }
    .gallery-section-header h4 { font-size: .9rem; font-weight: 700; color: #334155; margin: 0; }

    .gallery-admin-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr));
      gap: 1rem;
    }
    .gallery-admin-item {
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
      position: relative; background: #f8fafc;
    }
    .gallery-admin-item img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .gallery-item-caption {
      padding: .4rem .6rem; font-size: .75rem; color: #475569;
      margin: 0; border-top: 1px solid #e2e8f0;
    }
    .gallery-delete-btn {
      position: absolute; top: .5rem; right: .5rem;
      background: rgba(239,68,68,.9); border: none; border-radius: 6px;
      color: #fff; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; opacity: 0; transition: opacity .2s;
    }
    .gallery-admin-item:hover .gallery-delete-btn { opacity: 1; }
    .gallery-delete-btn svg { width: 14px; height: 14px; }

    .empty-hint { color: #94a3b8; font-size: .875rem; text-align: center; padding: 2rem; }

    /* ── Contact tab ── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

    /* ── Shared form elements ── */
    label { display: flex; flex-direction: column; gap: .35rem; font-size: .875rem; font-weight: 500; }
    input, textarea, select {
      padding: .5rem .75rem; border: 1.5px solid var(--border, #e2e8f0); border-radius: 6px;
      font-size: .875rem; font-family: inherit; outline: none; transition: border-color .2s;
    }
    input:focus, textarea:focus, select:focus { border-color: var(--brand-primary, #1976D2); }
    textarea { resize: vertical; }

    @media (max-width: 900px) {
      .settings-grid { grid-template-columns: 1fr; }
      .two-col { grid-template-columns: 1fr; }
    }
  `],
})
export class BrandingSettingsComponent implements OnInit {
  private readonly cmsService    = inject(CmsService);
  private readonly fb            = inject(FormBuilder);
  private readonly pubBranding   = inject(PublicBrandingService);
  private readonly snack         = inject(MatSnackBar);
  readonly authCtx               = inject(AuthContextService);

  readonly activeTab = signal<'appearance' | 'content' | 'gallery' | 'contact'>('appearance');

  readonly tabs = [
    { id: 'appearance' as const, label: '🎨 Apparence' },
    { id: 'content'    as const, label: '📝 Contenu du site' },
    { id: 'gallery'    as const, label: '🖼 Galerie' },
    { id: 'contact'    as const, label: '📍 Contact & Réseaux' },
  ];

  selectedTenantId: string | null = null;
  branding: BrandingResponse | null = null;
  notices: any[] = [];
  saving = false;
  savingContent = false;
  savingContact = false;
  uploadingLogo = false;
  uploadingGallery = false;
  logoFile: File | null = null;
  logoPreview: string | null = null;
  showNoticeForm = false;
  readonly dragOver = signal(false);

  pendingGalleryFiles: { file: File; name: string; preview: string; caption: string }[] = [];

  // ── Form: appearance ──────────────────────────────────────────────────────

  form = this.fb.group({
    companyName:    [''],
    tagline:        [''],
    primaryColor:   ['#1976D2', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    secondaryColor: ['#424242', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    fontFamily:     ['Inter, sans-serif'],
    customCss:      [''],
  });

  // ── Form: content ─────────────────────────────────────────────────────────

  contentForm = this.fb.group({
    heroTitle:       [''],
    heroSubtitle:    [''],
    heroCtaText:     ['Demander un devis'],
    aboutTitle:      [''],
    aboutText:       [''],
    siteDescription: [''],
    stats:           this.fb.array<FormGroup>([]),
    services:        this.fb.array<FormGroup>([]),
  });

  get statsControls():    FormGroup[] { return (this.contentForm.controls.stats    as FormArray).controls as FormGroup[]; }
  get servicesControls(): FormGroup[] { return (this.contentForm.controls.services as FormArray).controls as FormGroup[]; }

  addStat()    { (this.contentForm.controls.stats    as FormArray).push(this.fb.group({ label: [''], value: [''] })); }
  removeStat(i: number) { (this.contentForm.controls.stats    as FormArray).removeAt(i); }
  addService() { (this.contentForm.controls.services as FormArray).push(this.fb.group({ icon: [''], title: [''], description: [''] })); }
  removeService(i: number) { (this.contentForm.controls.services as FormArray).removeAt(i); }

  // ── Form: contact ─────────────────────────────────────────────────────────

  contactForm = this.fb.group({
    contactEmail:    [''],
    contactPhone:    [''],
    contactAddress:  [''],
    socialFacebook:  [''],
    socialLinkedin:  [''],
    socialInstagram: [''],
    socialTwitter:   [''],
  });

  // ── Notices ───────────────────────────────────────────────────────────────

  noticeForm = this.fb.group({ title: ['', Validators.required], body: [''], severity: ['INFO'] });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadBranding();
    this.loadNotices();
  }

  onTenantChange(tenantId: string): void {
    this.selectedTenantId = tenantId;
    this.loadBranding();
  }

  // ── Branding load ─────────────────────────────────────────────────────────

  loadBranding(): void {
    this.cmsService.getBranding(this.selectedTenantId ?? undefined).subscribe(b => {
      this.branding = b;
      this.patchAllForms(b);
    });
  }

  private patchAllForms(b: BrandingResponse): void {
    this.form.patchValue({
      companyName: b.companyName, tagline: b.tagline,
      primaryColor: b.primaryColor, secondaryColor: b.secondaryColor,
      fontFamily: b.fontFamily, customCss: b.customCss ?? '',
    });

    this.contentForm.patchValue({
      heroTitle:       b.heroTitle    ?? '',
      heroSubtitle:    b.heroSubtitle ?? '',
      heroCtaText:     b.heroCtaText  ?? 'Demander un devis',
      aboutTitle:      b.aboutTitle   ?? '',
      aboutText:       b.aboutText    ?? '',
      siteDescription: b.siteDescription ?? '',
    });

    const statsArr = this.contentForm.controls.stats as FormArray;
    statsArr.clear();
    (b.stats ?? []).forEach(s => statsArr.push(this.fb.group({ label: [s.label], value: [s.value] })));

    const svcsArr = this.contentForm.controls.services as FormArray;
    svcsArr.clear();
    (b.services ?? []).forEach(s => svcsArr.push(this.fb.group({ icon: [s.icon], title: [s.title], description: [s.description] })));

    this.contactForm.patchValue({
      contactEmail:   b.contactEmail   ?? '',
      contactPhone:   b.contactPhone   ?? '',
      contactAddress: b.contactAddress ?? '',
      socialFacebook: b.socialFacebook ?? '',
      socialLinkedin: b.socialLinkedin ?? '',
      socialInstagram:b.socialInstagram?? '',
      socialTwitter:  b.socialTwitter  ?? '',
    });
  }

  get gallery(): GalleryItem[] { return this.branding?.gallery ?? []; }

  // ── Save appearance ───────────────────────────────────────────────────────

  saveAppearance(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    this.cmsService.updateBranding({
      companyName: v.companyName    || undefined,
      tagline:     v.tagline        || undefined,
      primaryColor:   v.primaryColor   || undefined,
      secondaryColor: v.secondaryColor || undefined,
      fontFamily:  v.fontFamily     || undefined,
      customCss:   v.customCss      || undefined,
      tenantId:    this.selectedTenantId ?? undefined,
    }).subscribe({
      next: b => { this.branding = b; this.saving = false; applyBrandingCssVars(b); this.pubBranding.invalidate(); },
      error: () => this.saving = false,
    });
  }

  // ── Save content ──────────────────────────────────────────────────────────

  saveContent(): void {
    this.savingContent = true;
    const v  = this.contentForm.value;
    const sv = this.contentForm.controls.services as FormArray;
    const st = this.contentForm.controls.stats    as FormArray;
    this.cmsService.updateBranding({
      heroTitle:       v.heroTitle       || undefined,
      heroSubtitle:    v.heroSubtitle    || undefined,
      heroCtaText:     v.heroCtaText     || undefined,
      aboutTitle:      v.aboutTitle      || undefined,
      aboutText:       v.aboutText       || undefined,
      siteDescription: v.siteDescription || undefined,
      servicesJson: JSON.stringify(sv.value.filter((s: any) => s.title)),
      statsJson:    JSON.stringify(st.value.filter((s: any) => s.label)),
      tenantId:     this.selectedTenantId ?? undefined,
    }).subscribe({
      next: b => { this.branding = b; this.savingContent = false; this.pubBranding.invalidate(); },
      error: () => this.savingContent = false,
    });
  }

  // ── Save contact ──────────────────────────────────────────────────────────

  saveContact(): void {
    this.savingContact = true;
    const v = this.contactForm.value;
    this.cmsService.updateBranding({
      contactEmail:   v.contactEmail   || undefined,
      contactPhone:   v.contactPhone   || undefined,
      contactAddress: v.contactAddress || undefined,
      socialFacebook: v.socialFacebook || undefined,
      socialLinkedin: v.socialLinkedin || undefined,
      socialInstagram:v.socialInstagram|| undefined,
      socialTwitter:  v.socialTwitter  || undefined,
      tenantId:       this.selectedTenantId ?? undefined,
    }).subscribe({
      next: b => { this.branding = b; this.savingContact = false; this.pubBranding.invalidate(); },
      error: () => this.savingContact = false,
    });
  }

  // ── Logo upload ───────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert('Fichier trop grand (max 2 Mo)'); return; }
    this.logoFile = f;
    const reader = new FileReader();
    reader.onload = e => this.logoPreview = e.target?.result as string;
    reader.readAsDataURL(f);
  }

  uploadLogo(): void {
    if (!this.logoFile) return;
    this.uploadingLogo = true;
    this.cmsService.uploadLogo(this.logoFile).subscribe({
      next: b => { this.branding = b; this.uploadingLogo = false; this.logoFile = null; this.logoPreview = null; this.pubBranding.invalidate(); },
      error: () => this.uploadingLogo = false,
    });
  }

  // ── Gallery ───────────────────────────────────────────────────────────────

  onGalleryFilesSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    this.addGalleryFiles(Array.from(files));
    (event.target as HTMLInputElement).value = '';
  }

  onGalleryDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files) this.addGalleryFiles(Array.from(files));
  }

  private addGalleryFiles(files: File[]): void {
    files.forEach(f => {
      if (f.size > 5 * 1024 * 1024) { alert(`${f.name} est trop grand (max 5 Mo)`); return; }
      const reader = new FileReader();
      reader.onload = e => this.pendingGalleryFiles.push({
        file: f, name: f.name, preview: e.target?.result as string, caption: ''
      });
      reader.readAsDataURL(f);
    });
  }

  uploadAllGalleryImages(): void {
    if (!this.pendingGalleryFiles.length) return;
    this.uploadingGallery = true;
    let remaining = this.pendingGalleryFiles.length;
    let failed = 0;
    this.pendingGalleryFiles.forEach(pf => {
      this.cmsService.uploadGalleryImage(pf.file, pf.caption, pf.name).subscribe({
        next: b => {
          this.branding = b;
          remaining--;
          if (remaining === 0) {
            this.pendingGalleryFiles = [];
            this.uploadingGallery = false;
            this.pubBranding.invalidate();
            if (failed > 0) {
              this.snack.open(`${failed} image(s) n'ont pas pu être uploadées`, 'Fermer', { duration: 5000 });
            }
          }
        },
        error: () => {
          failed++;
          remaining--;
          if (remaining === 0) {
            this.uploadingGallery = false;
            this.snack.open(`${failed} image(s) n'ont pas pu être uploadées`, 'Fermer', { duration: 5000 });
          }
        },
      });
    });
  }

  deleteGalleryImage(fid: string): void {
    if (!confirm('Supprimer cette image ?')) return;
    this.cmsService.deleteGalleryImage(fid).subscribe(b => {
      this.branding = b;
      this.pubBranding.invalidate();
    });
  }

  // ── Notices ───────────────────────────────────────────────────────────────

  loadNotices(): void { this.cmsService.getAllNotices().subscribe(n => this.notices = n); }

  createNotice(): void {
    if (this.noticeForm.invalid) return;
    const v = this.noticeForm.value;
    this.cmsService.createNotice({ title: v.title!, body: v.body || undefined, severity: v.severity as any }).subscribe(() => {
      this.showNoticeForm = false;
      this.noticeForm.reset({ title: '', body: '', severity: 'INFO' });
      this.loadNotices();
    });
  }

  deleteNotice(id: string): void {
    this.cmsService.deleteNotice(id).subscribe(() => this.loadNotices());
  }
}
