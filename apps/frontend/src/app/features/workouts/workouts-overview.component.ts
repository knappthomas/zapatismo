import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Workout } from '../../core/models/workout.model';
import { WorkoutsService } from '../../core/services/workouts.service';
import { WorkoutsListPartComponent } from './workouts-list-part.component';

@Component({
  selector: 'app-workouts-overview',
  imports: [RouterLink, WorkoutsListPartComponent],
  template: `
    <div class="max-w-6xl mx-auto" data-cy="workouts-overview">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 class="text-3xl font-bold">Workouts</h1>
        <a routerLink="/workouts/new" class="btn btn-primary btn-sm" data-cy="add-workout">Add Workout</a>
      </div>

      <app-workouts-list-part
        [workouts]="workouts()"
        [loading]="loading()"
        [error]="error()"
        [showActions]="true"
        (deleteWorkout)="openDeleteConfirm($event)"
      />

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

  protected readonly workouts = signal<Workout[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly workoutToDelete = signal<Workout | null>(null);
  protected readonly deleting = signal(false);

  ngOnInit(): void {
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
