import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CmsService, BrandingResponse } from '../../../core/services/cms.service';
import { AuthContextService } from '../../../core/services/auth-context.service';

@Component({
  selector: 'app-branding-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <h2>Personnalisation</h2>
      <div style="display:flex;align-items:center;gap:1rem">
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
        <button class="btn-primary" (click)="save()"
                [disabled]="form.invalid || saving || (authCtx.isSuperAdmin() && !selectedTenantId)">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    <div class="settings-grid">

      <!-- Preview panel -->
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
        </div>
      </div>

      <!-- Form panel -->
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
            <textarea formControlName="customCss" rows="6"
                      placeholder=":root { --brand-radius: 8px; }"></textarea>
          </fieldset>
        </form>
      </div>
    </div>

    <!-- Announcements section -->
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
            <label>Titre *
              <input formControlName="title" placeholder="Maintenance programmée">
            </label>
            <label>Contenu
              <textarea formControlName="body" rows="3"
                        placeholder="Le système sera indisponible le..."></textarea>
            </label>
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
  `,
  styles: [`
    .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem; }
    .preview-card  { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .preview-header{ padding: 1.5rem; display: flex; gap: 1rem; align-items: center; }
    .preview-logo  { height: 48px; width: auto; border-radius: 4px; background: rgba(255,255,255,.2); }
    .preview-name  { font-size: 1.1rem; font-weight: 700; }
    .preview-tagline { font-size: .85rem; opacity: .85; }
    .preview-body  { padding: 1rem; background: var(--surface); }
    .preview-nav   { font-weight: 600; margin-bottom: .5rem; }
    .preview-content { color: var(--text-secondary); font-size: .9rem; }
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
    .notice-info   { display: flex; gap: 1rem; align-items: center; }
    .notice-severity { font-weight: 700; font-size: .75rem; text-transform: uppercase; }
    .notice-info    { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
  `],
})
export class BrandingSettingsComponent implements OnInit {
  private readonly cmsService = inject(CmsService);
  private readonly fb         = inject(FormBuilder);
  readonly authCtx            = inject(AuthContextService);

  selectedTenantId: string | null = null;
  branding: BrandingResponse | null = null;
  notices: any[] = [];
  saving = false;
  uploadingLogo = false;
  logoFile: File | null = null;
  logoPreview: string | null = null;
  showNoticeForm = false;

  form = this.fb.group({
    companyName:    [''],
    tagline:        [''],
    primaryColor:   ['#1976D2', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    secondaryColor: ['#424242', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    fontFamily:     ['Inter, sans-serif'],
    customCss:      [''],
  });

  noticeForm = this.fb.group({
    title:    ['', Validators.required],
    body:     [''],
    severity: ['INFO'],
  });

  ngOnInit() {
    this.loadBranding();
    this.loadNotices();
  }

  onTenantChange(tenantId: string) {
    this.selectedTenantId = tenantId;
    this.loadBranding();
  }

  loadBranding() {
    this.cmsService.getBranding(this.selectedTenantId ?? undefined).subscribe(b => {
      this.branding = b;
      this.form.patchValue({
        companyName:    b.companyName,
        tagline:        b.tagline,
        primaryColor:   b.primaryColor,
        secondaryColor: b.secondaryColor,
        fontFamily:     b.fontFamily,
        customCss:      b.customCss ?? '',
      });
    });
  }

  loadNotices() {
    this.cmsService.getAllNotices().subscribe(n => this.notices = n);
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    this.cmsService.updateBranding({
      companyName:    v.companyName    || undefined,
      tagline:        v.tagline        || undefined,
      primaryColor:   v.primaryColor   || undefined,
      secondaryColor: v.secondaryColor || undefined,
      fontFamily:     v.fontFamily     || undefined,
      customCss:      v.customCss      || undefined,
      tenantId:       this.selectedTenantId ?? undefined,
    }).subscribe({
      next: b => { this.branding = b; this.saving = false; applyBrandingCssVars(b); },
      error: () => { this.saving = false; },
    });
  }

  onLogoSelected(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert('Fichier trop grand (max 2 Mo)'); return; }
    this.logoFile = f;
    const reader = new FileReader();
    reader.onload = e => this.logoPreview = e.target?.result as string;
    reader.readAsDataURL(f);
  }

  uploadLogo() {
    if (!this.logoFile) return;
    this.uploadingLogo = true;
    this.cmsService.uploadLogo(this.logoFile).subscribe({
      next: b => { this.branding = b; this.uploadingLogo = false; this.logoFile = null; this.logoPreview = null; },
      error: () => { this.uploadingLogo = false; },
    });
  }

  createNotice() {
    if (this.noticeForm.invalid) return;
    const v = this.noticeForm.value;
    this.cmsService.createNotice({ title: v.title!, body: v.body || undefined, severity: v.severity as any }).subscribe(() => {
      this.showNoticeForm = false;
      this.noticeForm.reset({ title: '', body: '', severity: 'INFO' });
      this.loadNotices();
    });
  }

  deleteNotice(id: string) {
    this.cmsService.deleteNotice(id).subscribe(() => this.loadNotices());
  }
}

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
