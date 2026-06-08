import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmsService, NoticeResponse } from '../../services/cms.service';

@Component({
  selector: 'app-notice-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (notice of visibleNotices; track notice.id) {
      <div class="notice-banner" [class]="'notice-' + notice.severity.toLowerCase()">
        <span class="notice-text"><strong>{{ notice.title }}</strong>
          @if (notice.body) { — {{ notice.body }} }
        </span>
        <button class="notice-close" (click)="dismiss(notice.id)">✕</button>
      </div>
    }
  `,
  styles: [`
    .notice-banner { display: flex; justify-content: space-between; align-items: center;
                     padding: .6rem 1.5rem; font-size: .875rem; }
    .notice-info    { background: #dbeafe; color: #1e40af; border-bottom: 1px solid #bfdbfe; }
    .notice-warning { background: #fef9c3; color: #854d0e; border-bottom: 1px solid #fde047; }
    .notice-error   { background: #fee2e2; color: #991b1b; border-bottom: 1px solid #fca5a5; }
    .notice-close   { background: none; border: none; cursor: pointer; font-size: 1rem; opacity: .7; padding: 0 .25rem; }
    .notice-close:hover { opacity: 1; }
  `],
})
export class NoticeBannerComponent implements OnInit {
  private cmsService = inject(CmsService);

  notices: NoticeResponse[] = [];
  dismissed = new Set<string>();

  get visibleNotices() { return this.notices.filter(n => !this.dismissed.has(n.id)); }

  ngOnInit() {
    this.cmsService.getActiveNotices().subscribe({
      next: n => this.notices = n,
      error: () => {},
    });
  }

  dismiss(id: string) { this.dismissed.add(id); }
}
