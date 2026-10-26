import {
  Component, Input, OnInit, OnChanges, SimpleChanges,
  forwardRef, inject, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReferenceService, RefValue } from '../../services/reference.service';

/**
 * Reusable dynamic dropdown backed by the Reference Data API.
 *
 * Usage (Reactive Forms):
 *   <erp-ref-select category="TYPE_PROJET" formControlName="typeProjet" />
 *
 * Usage (Template-driven):
 *   <erp-ref-select category="COULEUR" [(ngModel)]="form.couleur" />
 */
@Component({
  selector: 'erp-ref-select',
  standalone: true,
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RefSelectComponent),
    multi: true,
  }],
  styles: [`
    select {
      width: 100%;
      padding: .45rem .7rem;
      border: 1.5px solid var(--clr-border, #e2e8f0);
      border-radius: 6px;
      font-size: .875rem;
      font-family: inherit;
      outline: none;
      background: #fff;
      transition: border-color .2s;
      appearance: auto;
    }
    select:focus { border-color: var(--clr-primary, #2563eb); }
    select:disabled { opacity: .6; cursor: not-allowed; background: #f8fafc; }
    select.ng-invalid.ng-touched { border-color: #ef4444; }
  `],
  template: `
    <select
      [class]="selectClass"
      [disabled]="isDisabled"
      [required]="required"
      (change)="handleChange($any($event.target).value)"
      (blur)="onTouched()">
      <option value="">{{ placeholder }}</option>
      @for (v of values$ | async; track v.id) {
        <option
          [value]="v.code"
          [selected]="v.code === currentValue"
          [style.color]="v.color ?? undefined">
          {{ v.label }}
        </option>
      }
    </select>
  `,
})
export class RefSelectComponent implements OnInit, OnChanges, ControlValueAccessor {
  private refSvc = inject(ReferenceService);
  private cdr    = inject(ChangeDetectorRef);

  @Input() category!: string;
  @Input() placeholder = '— Sélectionner —';
  @Input() selectClass = '';
  @Input() required    = false;

  currentValue = '';
  isDisabled   = false;
  values$!: Observable<RefValue[]>;

  private _onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  ngOnInit(): void {
    this.loadValues();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category'] && !changes['category'].firstChange) {
      this.loadValues();
    }
  }

  private loadValues(): void {
    if (!this.category) return;
    this.values$ = this.refSvc.getValues(this.category).pipe(
      catchError(() => of([] as RefValue[]))
    );
  }

  handleChange(v: string): void {
    this.currentValue = v;
    this._onChange(v);
  }

  // ControlValueAccessor
  writeValue(v: string | null): void {
    this.currentValue = v ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
    this.cdr.markForCheck();
  }
}
