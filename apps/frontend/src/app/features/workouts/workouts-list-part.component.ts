import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { Workout } from '../../core/models/workout.model';

@Component({
  selector: 'app-workouts-list-part',
  imports: [RouterLink, DatePipe],
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
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Steps</th>
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
                <td><span class="badge badge-outline">{{ workout.type }}</span></td>
                <td>{{ workout.startTime | date: 'short' }}</td>
                <td>{{ workout.endTime | date: 'short' }}</td>
                <td>{{ workout.steps }}</td>
                <td>{{ workout.distanceKm }}</td>
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

  readonly deleteWorkout = output<Workout>();

  protected shoeLabel(workout: Workout): string {
    if (workout.shoe) return `${workout.shoe.brandName} – ${workout.shoe.shoeName}`;
    return '—';
  }

  protected onDeleteClicked(workout: Workout): void {
    this.deleteWorkout.emit(workout);
  }
}
