import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpEventType } from '@angular/common/http';

export interface UploadedFile {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBarModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50"
         [class.border-blue-500]="dragOver"
         (dragover)="onDragOver($event)"
         (dragleave)="dragOver = false"
         (drop)="onDrop($event)">

      <mat-icon class="text-4xl text-blue-400 mb-2">cloud_upload</mat-icon>
      <p class="text-gray-600 mb-2">
        Glissez vos fichiers ici ou
        <label class="text-blue-600 cursor-pointer font-medium hover:underline">
          parcourez
          <input type="file" [accept]="accept" [multiple]="multiple" class="hidden"
                 (change)="onFileInput($event)"/>
        </label>
      </p>
      <p class="text-xs text-gray-400">{{ hint }}</p>

      @if (progress > 0 && progress < 100) {
        <mat-progress-bar mode="determinate" [value]="progress" class="mt-3"/>
      }
    </div>

    @if (uploaded.length > 0) {
      <ul class="mt-3 space-y-1">
        @for (f of uploaded; track f.id) {
          <li class="flex items-center gap-2 text-sm text-gray-700 bg-white rounded px-3 py-2 shadow-sm">
            <mat-icon class="text-blue-500 text-base">attach_file</mat-icon>
            <span class="flex-1 truncate">{{ f.fileName }}</span>
            <span class="text-gray-400 text-xs">{{ (f.fileSize / 1024) | number:'1.0-0' }} KB</span>
          </li>
        }
      </ul>
    }
  `,
})
export class FileUploadComponent {
  @Input() entityType = 'DEVIS_REQUEST';
  @Input() entityId!: string;
  @Input() accept = 'image/*,application/pdf,.dwg,.dxf';
  @Input() multiple = true;
  @Input() hint = 'PDF, images, plans (max 10 MB par fichier)';
  @Output() uploaded$ = new EventEmitter<UploadedFile[]>();

  private http  = inject(HttpClient);
  private snack = inject(MatSnackBar);

  dragOver = false;
  progress = 0;
  uploaded: UploadedFile[] = [];

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver = true;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
    const files = e.dataTransfer?.files;
    if (files) this.uploadFiles(Array.from(files));
  }

  onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.uploadFiles(Array.from(input.files));
  }

  private uploadFiles(files: File[]) {
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        this.snack.open(`${file.name} dépasse 10 MB`, 'OK', { duration: 3000 });
        return;
      }
      const form = new FormData();
      form.append('file', file);
      this.http.post<UploadedFile>(
        `/api/v1/sales/attachments/${this.entityType}/${this.entityId}`,
        form,
        { reportProgress: true, observe: 'events' }
      ).subscribe({
        next: event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress = Math.round(100 * event.loaded / event.total);
          } else if (event.type === HttpEventType.Response) {
            this.progress = 0;
            const uploaded = event.body!;
            this.uploaded.push(uploaded);
            this.uploaded$.emit([...this.uploaded]);
            this.snack.open(`${file.name} uploadé avec succès`, '', { duration: 2000 });
          }
        },
        error: () => {
          this.progress = 0;
          this.snack.open(`Échec upload de ${file.name}`, 'OK', { duration: 4000 });
        },
      });
    });
  }
}
