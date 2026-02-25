import { Component, inject, OnInit, signal, computed } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { WorkoutsService } from '../../core/services/workouts.service';
import { ShoesService } from '../../core/services/shoes.service';
import type { WorkoutType } from '../../core/models/workout.model';
import type { Shoe } from '../../core/models/shoe.model';

const MAX_STEPS = 100000;
const MAX_DISTANCE_KM = 100000;
const MAX_LOCATION_LENGTH = 50;

@Component({
  selector: 'app-workout-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto" data-cy="workout-form-container">
      <h1 class="text-3xl font-bold mb-6">{{ isEdit() ? 'Edit workout' : 'Add workout' }}</h1>

      @if (formError()) {
        <div role="alert" class="alert alert-error mb-4" data-cy="workout-form-error">
          <span>{{ formError() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" data-cy="workout-form">
        <fieldset [disabled]="saving()">
          <label class="form-control w-full mb-4">
            <span class="label">Type <span class="text-error">*</span></span>
            <select formControlName="type" class="select select-bordered w-full" data-cy="workout-type">
              <option value="RUNNING">Running</option>
              <option value="WALKING">Walking</option>
            </select>
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Start date & time <span class="text-error">*</span></span>
            <input
              type="datetime-local"
              formControlName="startTime"
              class="input input-bordered w-full"
              data-cy="workout-start-time"
            />
            @if (form.get('startTime')?.invalid && form.get('startTime')?.touched) {
              <span class="label text-error text-sm">Start date and time are required.</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">End date & time <span class="text-error">*</span></span>
            <input
              type="datetime-local"
              formControlName="endTime"
              class="input input-bordered w-full"
              data-cy="workout-end-time"
            />
            @if (form.get('endTime')?.invalid && form.get('endTime')?.touched) {
              <span class="label text-error text-sm">End date and time are required.</span>
            }
            @if (form.errors?.['timeRange'] && (form.get('endTime')?.touched || form.get('startTime')?.touched)) {
              <span class="label text-error text-sm">End must be after or equal to start.</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Steps <span class="text-error">*</span></span>
            <input
              type="number"
              formControlName="steps"
              class="input input-bordered w-full"
              placeholder="e.g. 5000"
              min="0"
              [max]="MAX_STEPS"
              step="1"
              data-cy="workout-steps"
            />
            @if (form.get('steps')?.invalid && form.get('steps')?.touched) {
              <span class="label text-error text-sm">Must be between 0 and {{ MAX_STEPS }}.</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Distance (km) <span class="text-error">*</span></span>
            <input
              type="number"
              formControlName="distanceKm"
              class="input input-bordered w-full"
              placeholder="e.g. 10.5"
              min="0"
              [max]="MAX_DISTANCE_KM"
              step="0.01"
              data-cy="workout-distance"
            />
            @if (form.get('distanceKm')?.invalid && form.get('distanceKm')?.touched) {
              <span class="label text-error text-sm">Must be between 0 and {{ MAX_DISTANCE_KM }} km.</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Location <span class="text-error">*</span></span>
            <input
              type="text"
              formControlName="location"
              class="input input-bordered w-full"
              placeholder="e.g. Central Park"
              [maxlength]="MAX_LOCATION_LENGTH"
              data-cy="workout-location"
            />
            <span class="label text-base-content/70 text-sm"
              >{{ form.get('location')?.value?.length ?? 0 }}/{{ MAX_LOCATION_LENGTH }}</span
            >
            @if (form.get('location')?.invalid && form.get('location')?.touched) {
              <span class="label text-error text-sm">Location is required (max {{ MAX_LOCATION_LENGTH }} characters).</span>
            }
          </label>

          <label class="form-control w-full mb-6">
            <span class="label">Shoe used</span>
            <select formControlName="shoeId" class="select select-bordered w-full" data-cy="workout-shoe">
              <option [ngValue]="null">None</option>
              @for (shoe of shoes(); track shoe.id) {
                <option [ngValue]="shoe.id">{{ shoe.brandName }} – {{ shoe.shoeName }}</option>
              }
            </select>
          </label>

          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid" data-cy="workout-submit">
              @if (saving()) {
                <span class="loading loading-spinner loading-sm"></span>
              }
              {{ isEdit() ? 'Save' : 'Create' }}
            </button>
            <a routerLink="/workouts" class="btn btn-ghost">Cancel</a>
          </div>
        </fieldset>
      </form>
    </div>
  `,
})
export class WorkoutFormComponent implements OnInit {
  private readonly workoutsService = inject(WorkoutsService);
  private readonly shoesService = inject(ShoesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly MAX_STEPS = MAX_STEPS;
  protected readonly MAX_DISTANCE_KM = MAX_DISTANCE_KM;
  protected readonly MAX_LOCATION_LENGTH = MAX_LOCATION_LENGTH;
  protected readonly shoes = signal<Shoe[]>([]);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.group({
    type: this.fb.control<'RUNNING' | 'WALKING'>('RUNNING', Validators.required),
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    steps: [0, [Validators.required, Validators.min(0), Validators.max(MAX_STEPS)]],
    distanceKm: [0, [Validators.required, Validators.min(0), Validators.max(MAX_DISTANCE_KM)]],
    location: ['', [Validators.required, Validators.maxLength(MAX_LOCATION_LENGTH)]],
    shoeId: this.fb.control<number | null>(null),
  }, { validators: workoutTimeRangeValidator });

  protected readonly isEdit = computed(() => !!this.workoutId());

  private readonly workoutId = signal<number | null>(null);

  ngOnInit(): void {
    this.shoesService.getList().subscribe({
      next: (list) => this.shoes.set(list),
      error: () => this.formError.set('Failed to load shoes.'),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = Number(id);
      if (Number.isInteger(numId)) {
        this.workoutId.set(numId);
        this.workoutsService.getOne(numId).subscribe({
          next: (workout) => {
            this.form.patchValue({
              type: workout.type,
              startTime: toDatetimeLocal(workout.startTime),
              endTime: toDatetimeLocal(workout.endTime),
              steps: workout.steps,
              distanceKm: workout.distanceKm,
              location: workout.location,
              shoeId: workout.shoeId ?? null,
            });
          },
          error: () => {
            this.formError.set('Workout not found.');
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
    const startTime = raw.startTime ? `${raw.startTime}:00` : '';
    const endTime = raw.endTime ? `${raw.endTime}:00` : '';
    const payload = {
      type: raw.type as WorkoutType,
      startTime,
      endTime,
      steps: raw.steps ?? 0,
      distanceKm: raw.distanceKm ?? 0,
      location: raw.location ?? '',
      shoeId: raw.shoeId ?? undefined,
    };

    const id = this.workoutId();
    if (id !== null) {
      this.workoutsService.update(id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigateByUrl('/workouts');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.errorMessage(err));
        },
      });
    } else {
      this.workoutsService.create(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigateByUrl('/workouts');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.errorMessage(err));
        },
      });
    }
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 404) return 'Workout not found.';
    if (err.status === 403) return 'You do not have permission to modify this workout.';
    const body = err.error;
    if (body?.message) {
      const msg = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      return msg;
    }
    return 'Something went wrong. Please try again.';
  }
}

/** Validator: end time must be after or equal to start time. */
function workoutTimeRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startTime')?.value as string;
  const end = group.get('endTime')?.value as string;
  if (!start || !end) return null;
  if (new Date(end) < new Date(start)) {
    return { timeRange: true };
  }
  return null;
}

/** Convert ISO date string to datetime-local value (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}
