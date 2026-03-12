import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ShoesService } from '../../core/services/shoes.service';

const MAX_NAME_LENGTH = 75;
const MAX_KM_TARGET = 100000;

@Component({
  selector: 'app-shoe-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto" data-cy="shoe-form-container">
      <h1 class="text-3xl font-bold mb-6">{{ isEdit() ? 'Edit shoe' : 'Add shoe' }}</h1>

      @if (formError()) {
        <div role="alert" class="alert alert-error mb-4" data-cy="shoe-form-error">
          <span>{{ formError() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" data-cy="shoe-form">
        <fieldset [disabled]="saving()">
          <label class="form-control w-full mb-4">
            <span class="label">Photo URL <span class="text-error">*</span></span>
            <input
              type="url"
              formControlName="photoUrl"
              class="input input-bordered w-full"
              placeholder="https://example.com/shoe.jpg"
              maxlength="2048"
              data-cy="shoe-photo-url"
            />
            @if (form.get('photoUrl')?.invalid && form.get('photoUrl')?.touched) {
              <span class="label text-error text-sm">A valid photo URL is required.</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Brand name <span class="text-error">*</span></span>
            <input
              type="text"
              formControlName="brandName"
              class="input input-bordered w-full"
              placeholder="e.g. Nike"
              [maxlength]="MAX_NAME_LENGTH"
              data-cy="shoe-brand"
            />
            <span class="label text-base-content/70 text-sm"
              >{{ form.get('brandName')?.value?.length ?? 0 }}/{{ MAX_NAME_LENGTH }}</span
            >
            @if (form.get('brandName')?.invalid && form.get('brandName')?.touched) {
              <span class="label text-error text-sm">Brand is required (max {{ MAX_NAME_LENGTH }} characters).</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Shoe name <span class="text-error">*</span></span>
            <input
              type="text"
              formControlName="shoeName"
              class="input input-bordered w-full"
              placeholder="e.g. Pegasus 40"
              [maxlength]="MAX_NAME_LENGTH"
              data-cy="shoe-name"
            />
            <span class="label text-base-content/70 text-sm"
              >{{ form.get('shoeName')?.value?.length ?? 0 }}/{{ MAX_NAME_LENGTH }}</span
            >
            @if (form.get('shoeName')?.invalid && form.get('shoeName')?.touched) {
              <span class="label text-error text-sm">Shoe name is required (max {{ MAX_NAME_LENGTH }} characters).</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Buying date <span class="text-error">*</span></span>
            <input
              type="date"
              formControlName="buyingDate"
              class="input input-bordered w-full"
              data-cy="shoe-buying-date"
            />
            @if (form.get('buyingDate')?.invalid && form.get('buyingDate')?.touched) {
              <span class="label text-error text-sm">Buying date is required.</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Buying location</span>
            <input
              type="text"
              formControlName="buyingLocation"
              class="input input-bordered w-full"
              placeholder="e.g. Berlin"
              data-cy="shoe-buying-location"
            />
          </label>

          <label class="form-control w-full mb-6">
            <span class="label">Kilometer target (km) <span class="text-error">*</span></span>
            <input
              type="number"
              formControlName="kilometerTarget"
              class="input input-bordered w-full"
              placeholder="e.g. 800"
              min="0"
              [max]="MAX_KM_TARGET"
              step="1"
              data-cy="shoe-kilometer-target"
            />
            @if (form.get('kilometerTarget')?.invalid && form.get('kilometerTarget')?.touched) {
              <span class="label text-error text-sm"
                >Must be between 0 and {{ MAX_KM_TARGET }} km.</span
              >
            }
          </label>

          @if (isEdit()) {
            <div class="space-y-4 mb-6">
              <label class="form-control w-full">
                <div class="label">
                  <input
                    type="checkbox"
                    formControlName="isDefaultForRunning"
                    class="checkbox checkbox-primary"
                    data-cy="shoe-is-default-running"
                  />
                  <span class="label-text">Default for running</span>
                </div>
                <span class="label text-base-content/70 text-sm"
                  >Newly imported running workouts will be assigned to this shoe when set.</span
                >
              </label>
              <label class="form-control w-full">
                <div class="label">
                  <input
                    type="checkbox"
                    formControlName="isDefaultForWalking"
                    class="checkbox checkbox-primary"
                    data-cy="shoe-is-default-walking"
                  />
                  <span class="label-text">Default for walking</span>
                </div>
                <span class="label text-base-content/70 text-sm"
                  >Newly imported walking workouts will be assigned to this shoe when set.</span
                >
              </label>
            </div>
          }

          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid" data-cy="shoe-submit">
              @if (saving()) {
                <span class="loading loading-spinner loading-sm"></span>
              }
              {{ isEdit() ? 'Save' : 'Create' }}
            </button>
            <a routerLink="/shoes" class="btn btn-ghost">Cancel</a>
          </div>
        </fieldset>
      </form>
    </div>
  `,
})
export class ShoeFormComponent implements OnInit {
  private readonly shoesService = inject(ShoesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly MAX_NAME_LENGTH = MAX_NAME_LENGTH;
  protected readonly MAX_KM_TARGET = MAX_KM_TARGET;
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    photoUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    brandName: ['', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]],
    shoeName: ['', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]],
    buyingDate: ['', Validators.required],
    buyingLocation: [''],
    kilometerTarget: [0, [Validators.required, Validators.min(0), Validators.max(MAX_KM_TARGET)]],
    isDefaultForRunning: [false],
    isDefaultForWalking: [false],
  });

  protected readonly isEdit = computed(() => !!this.shoeId());

  private readonly shoeId = signal<number | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = Number(id);
      if (Number.isInteger(numId)) {
        this.shoeId.set(numId);
        this.shoesService.getOne(numId).subscribe({
          next: (shoe) => {
            this.form.patchValue({
              photoUrl: shoe.photoUrl,
              brandName: shoe.brandName,
              shoeName: shoe.shoeName,
              buyingDate: shoe.buyingDate.toString().slice(0, 10),
              buyingLocation: shoe.buyingLocation ?? '',
              kilometerTarget: shoe.kilometerTarget,
              isDefaultForRunning: shoe.isDefaultForRunning,
              isDefaultForWalking: shoe.isDefaultForWalking,
            });
          },
          error: () => {
            this.formError.set('Shoe not found.');
          },
        });
      }
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');

    const raw = this.form.getRawValue();
    const basePayload = {
      photoUrl: raw.photoUrl,
      brandName: raw.brandName,
      shoeName: raw.shoeName,
      buyingDate: raw.buyingDate,
      buyingLocation: raw.buyingLocation || undefined,
      kilometerTarget: raw.kilometerTarget,
    };

    const id = this.shoeId();
    if (id !== null) {
      const payload = {
        ...basePayload,
        isDefaultForRunning: raw.isDefaultForRunning,
        isDefaultForWalking: raw.isDefaultForWalking,
      };
      this.shoesService.update(id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigateByUrl('/shoes');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.errorMessage(err));
        },
      });
    } else {
      this.shoesService.create(basePayload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigateByUrl('/shoes');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.errorMessage(err));
        },
      });
    }
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 404) return 'Shoe not found.';
    if (err.status === 403) return 'You do not have permission to modify this shoe.';
    const body = err.error;
    if (body?.message) {
      const msg = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      return msg;
    }
    return 'Something went wrong. Please try again.';
  }
}
