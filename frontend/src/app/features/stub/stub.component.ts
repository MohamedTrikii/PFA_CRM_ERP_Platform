import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe }      from '@angular/common';
import { map }            from 'rxjs/operators';
import { MatCardModule }  from '@angular/material/card';

@Component({
  standalone: true,
  imports: [AsyncPipe, MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>{{ label$ | async }} – Phase 3</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="mt-4 text-gray-500">This module will be built in Phase 3.</p>
      </mat-card-content>
    </mat-card>
  `,
})
export class StubComponent {
  private route = inject(ActivatedRoute);
  label$ = this.route.data.pipe(map(d => d['label'] ?? 'Module'));
}
