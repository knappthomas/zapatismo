import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { Workout } from '../../core/models/workout.model';
import { WorkoutsService } from '../../core/services/workouts.service';

@Component({
  selector: 'app-workouts-overview',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="max-w-6xl mx-auto" data-cy="workouts-overview">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 class="text-3xl font-bold">Workouts</h1>
        <a routerLink="/workouts/new" class="btn btn-primary btn-sm" data-cy="add-workout">Add Workout</a>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else if (error()) {
        <div role="alert" class="alert alert-error">
          <span>{{ error() }}</span>
        </div>
      } @else if (workouts().length === 0) {
        <div class="text-center py-12 text-base-content/70">
          <p>No workouts yet. Add your first workout to get started.</p>
          <a routerLink="/workouts/new" class="btn btn-primary mt-4">Add Workout</a>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Steps</th>
                <th>Distance (km)</th>
                <th>Location</th>
                <th>Shoe</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (workout of workouts(); track workout.id) {
                <tr>
                  <td><span class="badge badge-outline">{{ workout.type }}</span></td>
                  <td>{{ workout.startTime | date: 'short' }}</td>
                  <td>{{ workout.endTime | date: 'short' }}</td>
                  <td>{{ workout.steps }}</td>
                  <td>{{ workout.distanceKm }}</td>
                  <td>{{ workout.location }}</td>
                  <td>{{ shoeLabel(workout) }}</td>
                  <td>
                    <a [routerLink]="['/workouts', workout.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
                    <button type="button" class="btn btn-ghost btn-sm text-error" (click)="openDeleteConfirm(workout)">
                      Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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

  protected shoeLabel(workout: Workout): string {
    if (workout.shoe) return `${workout.shoe.brandName} – ${workout.shoe.shoeName}`;
    return '—';
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
