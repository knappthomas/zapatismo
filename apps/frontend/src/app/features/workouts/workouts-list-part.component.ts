import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';

import { Workout } from '../../core/models/workout.model';

@Component({
  selector: 'app-workouts-list-part',
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
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
        @if (showAddLink()) {
          <a [routerLink]="addLink()" class="btn btn-primary mt-4">Add Workout</a>
        }
      </div>
    } @else {
      <div class="overflow-x-auto" data-cy="workouts-list">
        <table class="table table-zebra">
          <thead>
            <tr>
              @if (showSelectColumn()) {
                <th class="w-10">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    [checked]="isAllSelected()"
                    [indeterminate]="isIndeterminate()"
                    (change)="onSelectAllChange($event)"
                    data-cy="workouts-select-all"
                    [attr.aria-label]="'Select all workouts'"
                  />
                </th>
              }
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Distance (km)</th>
              <th>Location</th>
              <th>Shoe</th>
              @if (showActions()) {
                <th></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (workout of workouts(); track workout.id) {
              <tr>
                @if (showSelectColumn()) {
                  <td>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      [checked]="isSelected(workout.id)"
                      (change)="onSelectionChange(workout.id, $event)"
                      [attr.data-cy]="'workout-select-' + workout.id"
                      [attr.aria-label]="'Select workout ' + workout.id"
                    />
                  </td>
                }
                <td><span class="badge badge-outline">{{ workout.type }}</span></td>
                <td>{{ workout.startTime | date: 'short' }}</td>
                <td>{{ workout.endTime | date: 'short' }}</td>
                <td>{{ workout.distanceKm | number : '1.2-2' }}</td>
                <td>{{ workout.location }}</td>
                <td>{{ shoeLabel(workout) }}</td>
                @if (showActions()) {
                  <td>
                    <a [routerLink]="['/workouts', workout.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
                    <button type="button" class="btn btn-ghost btn-sm text-error" (click)="onDeleteClicked(workout)">
                      Delete
                    </button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class WorkoutsListPartComponent {
  readonly workouts = input<Workout[]>([]);
  readonly loading = input(false);
  readonly error = input('');
  readonly showActions = input(true);
  readonly showAddLink = input(true);
  readonly addLink = input('/workouts/new');
  /** When true, show select column with per-row checkboxes and optional select-all. */
  readonly showSelectColumn = input(false);
  /** Currently selected workout ids (used when showSelectColumn is true). */
  readonly selectedIds = input<number[]>([]);

  readonly deleteWorkout = output<Workout>();
  /** Emitted when selection changes (new array of selected ids). */
  readonly selectionChange = output<number[]>();

  protected isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  protected isAllSelected(): boolean {
    const workouts = this.workouts();
    const ids = this.selectedIds();
    return workouts.length > 0 && ids.length === workouts.length;
  }

  protected isIndeterminate(): boolean {
    const ids = this.selectedIds();
    return ids.length > 0 && !this.isAllSelected();
  }

  protected onSelectAllChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const ids = checked ? this.workouts().map((w) => w.id) : [];
    this.selectionChange.emit(ids);
  }

  protected onSelectionChange(workoutId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedIds();
    const next = checked
      ? [...current, workoutId]
      : current.filter((id) => id !== workoutId);
    this.selectionChange.emit(next);
  }

  protected shoeLabel(workout: Workout): string {
    if (workout.shoe) return `${workout.shoe.brandName} – ${workout.shoe.shoeName}`;
    return '—';
  }

  protected onDeleteClicked(workout: Workout): void {
    this.deleteWorkout.emit(workout);
  }
}
