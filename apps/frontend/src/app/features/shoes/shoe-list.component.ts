import { DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { CreateShoeRequest, Shoe } from '../../core/models/shoe.model';
import { ShoesService } from '../../core/services/shoes.service';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

@Component({
  selector: 'app-shoe-list',
  imports: [DatePipe, NgClass, ReactiveFormsModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-3xl font-bold">Shoe Pairs</h1>
        <div class="join">
          <button
            type="button"
            class="btn join-item"
            [ngClass]="viewMode() === 'list' ? 'btn-primary' : 'btn-outline'"
            (click)="setViewMode('list')"
          >
            List View
          </button>
          <button
            type="button"
            class="btn join-item"
            [ngClass]="viewMode() === 'grid' ? 'btn-primary' : 'btn-outline'"
            (click)="setViewMode('grid')"
          >
            Grid View
          </button>
        </div>
      </div>

      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Add shoe pair</h2>
          <p class="text-sm text-base-content/70 mb-2">
            Upload one photo per pair and switch between compact list and image-first grid views.
          </p>

          <form class="space-y-4" [formGroup]="createForm" (ngSubmit)="createShoe()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="form-control">
                <span class="label-text">Name *</span>
                <input type="text" class="input input-bordered w-full" formControlName="name" />
                @if (createForm.controls.name.touched && createForm.controls.name.invalid) {
                  <span class="text-error text-xs mt-1">Name is required.</span>
                }
              </label>

              <label class="form-control">
                <span class="label-text">Brand</span>
                <input type="text" class="input input-bordered w-full" formControlName="brand" />
              </label>

              <label class="form-control">
                <span class="label-text">Model</span>
                <input type="text" class="input input-bordered w-full" formControlName="model" />
              </label>

              <label class="form-control">
                <span class="label-text">Color</span>
                <input type="text" class="input input-bordered w-full" formControlName="color" />
              </label>
            </div>

            <label class="form-control">
              <span class="label-text">Notes</span>
              <textarea
                class="textarea textarea-bordered h-24"
                formControlName="notes"
                placeholder="Optional usage notes"
              ></textarea>
            </label>

            <div class="form-control">
              <span class="label-text mb-1">Photo</span>
              <input
                type="file"
                class="file-input file-input-bordered w-full md:max-w-md"
                accept="image/*"
                (change)="onPhotoSelected($event)"
              />
              <p class="text-xs text-base-content/60 mt-2">Supported: image files up to 4 MB.</p>

              @if (photoPreview()) {
                <div class="mt-3 flex items-end gap-3">
                  <img
                    [src]="photoPreview()"
                    alt="Selected shoe photo preview"
                    class="h-28 w-28 rounded-lg object-cover border border-base-300"
                  />
                  <button type="button" class="btn btn-sm btn-ghost" (click)="clearSelectedPhoto()">
                    Remove photo
                  </button>
                </div>
              }
            </div>

            @if (submitError()) {
              <div role="alert" class="alert alert-error">
                <span>{{ submitError() }}</span>
              </div>
            }

            <button type="submit" class="btn btn-primary" [disabled]="submitting()">
              {{ submitting() ? 'Saving...' : 'Save shoe pair' }}
            </button>
          </form>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else if (error()) {
        <div role="alert" class="alert alert-error">
          <span>{{ error() }}</span>
        </div>
      } @else if (shoes().length === 0) {
        <div class="alert">
          <span>No shoe pairs yet. Add your first pair above.</span>
        </div>
      } @else if (viewMode() === 'list') {
        <div class="space-y-4">
          @for (shoe of shoes(); track shoe.id) {
            <article
              class="card bg-base-100 shadow-sm border border-base-300 lg:grid lg:grid-cols-[12rem_1fr]"
            >
              <div class="h-48 lg:h-full bg-base-200">
                @if (shoe.photoDataUrl) {
                  <img
                    [src]="shoe.photoDataUrl"
                    [alt]="shoe.name + ' photo'"
                    class="w-full h-full object-cover"
                  />
                } @else {
                  <div class="w-full h-full grid place-items-center text-base-content/60">No photo</div>
                }
              </div>
              <div class="card-body">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <h3 class="card-title">{{ shoe.name }}</h3>
                  <span class="badge badge-outline">#{{ shoe.id }}</span>
                </div>
                <p class="text-sm text-base-content/70">{{ shoeDetails(shoe) }}</p>
                @if (shoe.notes) {
                  <p class="text-sm">{{ shoe.notes }}</p>
                }
                <p class="text-xs text-base-content/60">Added {{ shoe.createdAt | date: 'medium' }}</p>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          @for (shoe of shoes(); track shoe.id) {
            <article class="card bg-base-100 shadow-md border border-base-300">
              <div class="h-72 bg-base-200">
                @if (shoe.photoDataUrl) {
                  <img
                    [src]="shoe.photoDataUrl"
                    [alt]="shoe.name + ' photo'"
                    class="w-full h-full object-cover"
                  />
                } @else {
                  <div class="w-full h-full grid place-items-center text-base-content/60">No photo</div>
                }
              </div>
              <div class="card-body">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="card-title text-lg">{{ shoe.name }}</h3>
                  <span class="badge badge-outline">#{{ shoe.id }}</span>
                </div>
                <p class="text-sm text-base-content/70">{{ shoeDetails(shoe) }}</p>
                @if (shoe.notes) {
                  <p class="text-sm">{{ shoe.notes }}</p>
                }
                <p class="text-xs text-base-content/60">Added {{ shoe.createdAt | date: 'mediumDate' }}</p>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class ShoeListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly shoesService = inject(ShoesService);

  protected readonly shoes = signal<Shoe[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly photoPreview = signal('');
  protected readonly viewMode = signal<'list' | 'grid'>('list');

  protected readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    brand: ['', [Validators.maxLength(120)]],
    model: ['', [Validators.maxLength(120)]],
    color: ['', [Validators.maxLength(120)]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  private selectedPhotoDataUrl: string | null = null;

  ngOnInit(): void {
    this.loadShoes();
  }

  protected setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode.set(mode);
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.clearSelectedPhoto();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.submitError.set('Please choose an image file.');
      input.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      this.submitError.set('Image is too large. Maximum size is 4 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      this.submitError.set('Could not read selected image.');
      this.clearSelectedPhoto();
    };

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.submitError.set('Could not read selected image.');
        this.clearSelectedPhoto();
        return;
      }

      this.selectedPhotoDataUrl = reader.result;
      this.photoPreview.set(reader.result);
      this.submitError.set('');
    };

    reader.readAsDataURL(file);
  }

  protected clearSelectedPhoto(): void {
    this.selectedPhotoDataUrl = null;
    this.photoPreview.set('');
  }

  protected createShoe(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');

    this.shoesService
      .create(this.buildCreatePayload())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (shoe) => {
          this.shoes.set([shoe, ...this.shoes()]);
          this.createForm.reset({
            name: '',
            brand: '',
            model: '',
            color: '',
            notes: '',
          });
          this.clearSelectedPhoto();
        },
        error: () => {
          this.submitError.set('Failed to save shoe pair. Please try again.');
        },
      });
  }

  protected shoeDetails(shoe: Shoe): string {
    const details = [shoe.brand, shoe.model, shoe.color].filter(
      (value): value is string => Boolean(value && value.trim().length > 0),
    );
    return details.length > 0 ? details.join(' • ') : 'No details provided';
  }

  private loadShoes(): void {
    this.loading.set(true);
    this.error.set('');

    this.shoesService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.shoes.set(data),
        error: () => this.error.set('Failed to load shoe pairs.'),
      });
  }

  private buildCreatePayload(): CreateShoeRequest {
    const raw = this.createForm.getRawValue();

    return {
      name: raw.name.trim(),
      brand: this.toOptional(raw.brand),
      model: this.toOptional(raw.model),
      color: this.toOptional(raw.color),
      notes: this.toOptional(raw.notes),
      photoDataUrl: this.selectedPhotoDataUrl ?? undefined,
    };
  }

  private toOptional(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
