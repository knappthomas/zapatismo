import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Workout } from '../../core/models/workout.model';
import { ShoesService } from '../../core/services/shoes.service';
import { StravaService } from '../../core/services/strava.service';
import { WorkoutsService } from '../../core/services/workouts.service';
import { WorkoutsListPartComponent } from './workouts-list-part.component';

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-workouts-overview',
  imports: [RouterLink, WorkoutsListPartComponent],
  template: `
    <div class="max-w-6xl mx-auto" data-cy="workouts-overview">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 class="text-3xl font-bold">Workouts</h1>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            (click)="openSyncModal()"
            data-cy="sync-strava"
          >
            Sync Strava
          </button>
          <a routerLink="/workouts/new" class="btn btn-primary btn-sm" data-cy="add-workout">Add Workout</a>
        </div>
      </div>

      <app-workouts-list-part
        [workouts]="workouts()"
        [loading]="loading()"
        [error]="error()"
        [showActions]="true"
        (deleteWorkout)="openDeleteConfirm($event)"
      />

      @if (syncModalOpen()) {
        <dialog id="sync-strava-modal" class="modal modal-open" open data-cy="sync-strava-modal">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Sync from Strava</h3>
            <p class="text-sm text-base-content/70 py-2">
              Import running and walking activities from this date until now.
            </p>
            @if (syncModalShoesLoaded() && !syncModalHasDefaultShoe()) {
              <div role="alert" class="alert alert-warning my-2" data-cy="sync-no-default-shoe-warning">
                <span>You don't have a default shoe set. Synced workouts will not be assigned to a shoe. You can set a default in Shoes.</span>
              </div>
            }
            <div class="form-control py-2">
              <label class="label" for="sync-from-date">
                <span class="label-text">From date</span>
              </label>
              <input
                id="sync-from-date"
                type="date"
                class="input input-bordered w-full max-w-xs"
                [value]="syncFromDate()"
                (input)="onSyncFromDateChange($event)"
                [disabled]="syncLoading()"
                data-cy="sync-from-date"
              />
            </div>
            @if (syncError()) {
              <div role="alert" class="alert alert-error my-2" data-cy="sync-error">
                <span>{{ syncError() }}</span>
              </div>
            }
            @if (syncResult()) {
              <div role="status" class="alert alert-success my-2" data-cy="sync-success">
                <span>{{ syncResult() }}</span>
              </div>
            }
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" (click)="closeSyncModal()" data-cy="sync-cancel">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="syncLoading() || !syncFromDate()"
                (click)="submitSync()"
                data-cy="sync-confirm"
              >
                @if (syncLoading()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Sync
              </button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button type="button" (click)="closeSyncModal()">close</button>
          </form>
        </dialog>
      }

      @if (workoutToDelete()) {
        <dialog id="delete-workout-modal" class="modal modal-open" open>
          <div class="modal-box">
            <h3 class="font-bold text-lg">Delete workout?</h3>
            <p class="py-4">
              Are you sure you want to delete this workout? This cannot be undone.
            </p>
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" (click)="cancelDelete()" data-cy="delete-cancel">Cancel</button>
              <button
                type="button"
                class="btn btn-error"
                [disabled]="deleting()"
                (click)="confirmDelete()"
                data-cy="delete-confirm"
              >
                @if (deleting()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Delete
              </button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button type="button" (click)="cancelDelete()">close</button>
          </form>
        </dialog>
      }
    </div>
  `,
})
export class WorkoutsOverviewComponent implements OnInit {
  private readonly workoutsService = inject(WorkoutsService);
  private readonly stravaService = inject(StravaService);
  private readonly shoesService = inject(ShoesService);

  protected readonly workouts = signal<Workout[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly workoutToDelete = signal<Workout | null>(null);
  protected readonly deleting = signal(false);

  protected readonly syncModalOpen = signal(false);
  protected readonly syncFromDate = signal(defaultFromDate());
  protected readonly syncLoading = signal(false);
  protected readonly syncResult = signal<string | null>(null);
  protected readonly syncError = signal('');
  /** Set when shoes have been loaded in sync modal; used to show "no default shoe" warning. */
  protected readonly syncModalShoesLoaded = signal(false);
  protected readonly syncModalHasDefaultShoe = signal(false);

  ngOnInit(): void {
    this.loadWorkouts();
  }

  private loadWorkouts(): void {
    this.workoutsService.getList().subscribe({
      next: (data) => {
        this.workouts.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load workouts.');
        this.loading.set(false);
      },
    });
  }

  protected openSyncModal(): void {
    this.syncModalOpen.set(true);
    this.syncResult.set(null);
    this.syncError.set('');
    this.syncModalShoesLoaded.set(false);
    this.syncModalHasDefaultShoe.set(false);
    this.stravaService.getLastSync().subscribe({
      next: (res) => {
        if (res.lastSyncAt) {
          this.syncFromDate.set(res.lastSyncAt.slice(0, 10));
        } else {
          this.syncFromDate.set(defaultFromDate());
        }
      },
      error: () => {
        this.syncFromDate.set(defaultFromDate());
      },
    });
    this.shoesService.getList().subscribe({
      next: (shoes) => {
        this.syncModalShoesLoaded.set(true);
        this.syncModalHasDefaultShoe.set(shoes.some((s) => s.isDefault));
      },
      error: () => {
        this.syncModalShoesLoaded.set(true);
        this.syncModalHasDefaultShoe.set(false);
      },
    });
  }

  protected closeSyncModal(): void {
    this.syncModalOpen.set(false);
    this.syncResult.set(null);
    this.syncError.set('');
    this.syncModalShoesLoaded.set(false);
    this.syncModalHasDefaultShoe.set(false);
  }

  protected onSyncFromDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value) {
      this.syncFromDate.set(input.value);
    }
  }

  protected submitSync(): void {
    const fromDate = this.syncFromDate();
    if (!fromDate) return;
    const from = new Date(fromDate);
    if (from > new Date()) {
      this.syncError.set('From date cannot be in the future.');
      return;
    }
    this.syncLoading.set(true);
    this.syncError.set('');
    this.syncResult.set(null);
    this.stravaService.sync({ fromDate }).subscribe({
      next: (res) => {
        const msg = res.message ?? `${res.imported} workout(s) imported.${res.skipped != null ? ` ${res.skipped} skipped.` : ''}`;
        this.syncResult.set(msg);
        this.syncLoading.set(false);
        this.loadWorkouts();
        // Close modal after short delay so user sees success
        setTimeout(() => this.closeSyncModal(), 1500);
      },
      error: (err) => {
        this.syncError.set(this.messageFromSyncError(err));
        this.syncLoading.set(false);
      },
    });
  }

  private messageFromSyncError(err: unknown): string {
    if (err && typeof err === 'object') {
      const o = err as Record<string, unknown>;
      const e = o['error'];
      if (e && typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
        return (e as { message: string }).message;
      }
      if (typeof o['message'] === 'string') return o['message'];
    }
    return 'Sync failed. Check your Strava connection in Settings and try again.';
  }

  protected openDeleteConfirm(workout: Workout): void {
    this.workoutToDelete.set(workout);
  }

  protected cancelDelete(): void {
    this.workoutToDelete.set(null);
  }

  protected confirmDelete(): void {
    const workout = this.workoutToDelete();
    if (!workout) return;
    this.deleting.set(true);
    this.workoutsService.delete(workout.id).subscribe({
      next: () => {
        this.workouts.update((list) => list.filter((w) => w.id !== workout.id));
        this.workoutToDelete.set(null);
        this.deleting.set(false);
      },
      error: () => {
        this.error.set('Failed to delete workout.');
        this.deleting.set(false);
      },
    });
  }
}
