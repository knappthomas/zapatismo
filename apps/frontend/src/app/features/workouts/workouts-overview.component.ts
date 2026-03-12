import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Workout } from '../../core/models/workout.model';
import type { Shoe } from '../../core/models/shoe.model';
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

      @if (selectedIds().length > 0) {
        <div class="flex items-center gap-2 mb-4 p-3 bg-base-200 rounded-lg" data-cy="workouts-toolbar">
          <span class="text-sm text-base-content/70">{{ selectedIds().length }} selected</span>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            (click)="openAssignShoeModal()"
            data-cy="assign-shoe-btn"
          >
            Assign Shoe
          </button>
        </div>
      }

      <app-workouts-list-part
        [workouts]="workouts()"
        [loading]="loading()"
        [error]="error()"
        [showActions]="true"
        [showSelectColumn]="true"
        [selectedIds]="selectedIds()"
        (selectionChange)="onSelectionChange($event)"
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

      @if (assignShoeModalOpen()) {
        <dialog id="assign-shoe-modal" class="modal modal-open" open data-cy="assign-shoe-modal">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Assign shoe to selected workouts</h3>
            <p class="text-sm text-base-content/70 py-2">
              Choose a shoe to assign to {{ selectedIds().length }} workout(s).
            </p>
            @if (assignShoeModalShoesLoaded() && assignShoeModalShoes().length === 0) {
              <div role="alert" class="alert alert-warning my-2" data-cy="assign-shoe-no-shoes">
                <span>You have no shoes. Create a shoe in Shoes first, then you can assign it here.</span>
              </div>
            }
            @if (assignShoeModalShoesLoaded() && assignShoeModalShoes().length > 0) {
              <div class="form-control py-2">
                <label class="label" for="assign-shoe-select">
                  <span class="label-text">Shoe</span>
                </label>
                <select
                  id="assign-shoe-select"
                  class="select select-bordered w-full max-w-md"
                  [value]="assignShoeSelectedId() != null ? assignShoeSelectedId() : ''"
                  (change)="onAssignShoeSelectChange($event)"
                  [disabled]="assignShoeLoading()"
                  data-cy="assign-shoe-select"
                >
                  <option value="" disabled>Select a shoe</option>
                  @for (shoe of assignShoeModalShoes(); track shoe.id) {
                    <option [value]="shoe.id">{{ shoe.brandName }} – {{ shoe.shoeName }}</option>
                  }
                </select>
              </div>
            }
            @if (assignShoeError()) {
              <div role="alert" class="alert alert-error my-2" data-cy="assign-shoe-error">
                <span>{{ assignShoeError() }}</span>
              </div>
            }
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" (click)="closeAssignShoeModal()" data-cy="assign-shoe-cancel">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="assignShoeLoading() || !hasValidShoeSelection()"
                (click)="confirmAssignShoe()"
                data-cy="assign-shoe-confirm"
              >
                @if (assignShoeLoading()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Update
              </button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button type="button" (click)="closeAssignShoeModal()">close</button>
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

  /** Selected workout ids for bulk assign. */
  protected readonly selectedIds = signal<number[]>([]);

  protected readonly assignShoeModalOpen = signal(false);
  protected readonly assignShoeModalShoesLoaded = signal(false);
  protected readonly assignShoeModalShoes = signal<Shoe[]>([]);
  protected readonly assignShoeSelectedId = signal<number | null>(null);
  protected readonly assignShoeLoading = signal(false);
  protected readonly assignShoeError = signal('');

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

  protected onSelectionChange(ids: number[]): void {
    this.selectedIds.set(ids);
  }

  protected openAssignShoeModal(): void {
    this.assignShoeModalOpen.set(true);
    this.assignShoeError.set('');
    this.assignShoeSelectedId.set(null);
    this.assignShoeModalShoesLoaded.set(false);
    this.assignShoeModalShoes.set([]);
    this.shoesService.getList().subscribe({
      next: (shoes) => {
        this.assignShoeModalShoes.set(shoes);
        this.assignShoeModalShoesLoaded.set(true);
        if (shoes.length === 1) {
          this.assignShoeSelectedId.set(shoes[0].id);
        }
      },
      error: () => {
        this.assignShoeModalShoesLoaded.set(true);
        this.assignShoeModalShoes.set([]);
      },
    });
  }

  protected closeAssignShoeModal(): void {
    this.assignShoeModalOpen.set(false);
    this.assignShoeError.set('');
    this.assignShoeSelectedId.set(null);
    this.assignShoeModalShoesLoaded.set(false);
    this.assignShoeModalShoes.set([]);
  }

  protected onAssignShoeSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select?.value;
    if (value !== '') {
      this.assignShoeSelectedId.set(Number(value));
    } else {
      this.assignShoeSelectedId.set(null);
    }
  }

  protected hasValidShoeSelection(): boolean {
    const shoes = this.assignShoeModalShoes();
    if (shoes.length === 0) return false;
    const id = this.assignShoeSelectedId();
    return id != null && shoes.some((s) => s.id === id);
  }

  protected confirmAssignShoe(): void {
    const shoeId = this.assignShoeSelectedId();
    const workoutIds = this.selectedIds();
    if (shoeId == null || workoutIds.length === 0) return;
    this.assignShoeLoading.set(true);
    this.assignShoeError.set('');
    this.workoutsService.bulkAssignShoe({ workoutIds, shoeId }).subscribe({
      next: () => {
        this.assignShoeLoading.set(false);
        this.closeAssignShoeModal();
        this.selectedIds.set([]);
        this.loadWorkouts();
      },
      error: (err) => {
        this.assignShoeError.set(this.messageFromBulkAssignError(err));
        this.assignShoeLoading.set(false);
      },
    });
  }

  private messageFromBulkAssignError(err: unknown): string {
    if (err && typeof err === 'object') {
      const o = err as Record<string, unknown>;
      const e = o['error'];
      if (e && typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
        return (e as { message: string }).message;
      }
      if (typeof o['message'] === 'string') return o['message'];
    }
    return 'Failed to assign shoe. Please try again.';
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
