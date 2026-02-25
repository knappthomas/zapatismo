import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Shoe } from '../../core/models/shoe.model';

@Component({
  selector: 'app-shoes-grid-part',
  imports: [DecimalPipe, RouterLink],
  template: `
    @if (loading()) {
      <div class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    } @else if (error()) {
      <div role="alert" class="alert alert-error">
        <span>{{ error() }}</span>
      </div>
    } @else if (shoes().length === 0) {
      <div class="text-center py-12 text-base-content/70">
        <p>No shoes yet. Add your first shoe to get started.</p>
        @if (showAddLink()) {
          <a [routerLink]="addLink()" class="btn btn-primary mt-4">Add Shoe</a>
        }
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-cy="shoes-grid">
        @for (shoe of shoes(); track shoe.id) {
          <div class="card bg-base-200 shadow-sm">
            <figure class="h-40 bg-base-300">
              <img [src]="shoe.photoUrl" [alt]="shoe.shoeName" class="object-cover w-full h-full" />
            </figure>
            <div class="card-body p-4">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="card-title text-lg">{{ shoe.shoeName }}</h2>
                @if (shoe.isDefault) {
                  <span class="badge badge-primary badge-sm" data-cy="shoe-default-badge">Default</span>
                }
              </div>
              <p class="text-sm text-base-content/80">{{ shoe.brandName }}</p>
              <p class="text-sm mt-1">
                <span data-cy="shoe-total-steps">Steps: {{ shoe.totalSteps }}</span>
              </p>
              <div class="mt-2">
                <span class="text-sm">Distance: {{ shoe.totalDistanceKm | number : '1.1-1' }} / {{ effectiveTargetKm(shoe) }} km</span>
                <progress
                  class="progress progress-primary mt-1 w-full"
                  [attr.value]="distanceProgressPercent(shoe)"
                  max="100"
                  role="progressbar"
                  [attr.aria-valuenow]="distanceProgressPercent(shoe)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  [attr.aria-label]="'Distance progress: ' + (shoe.totalDistanceKm | number : '1.2-2') + ' km of ' + effectiveTargetKm(shoe) + ' km'"
                  data-cy="shoe-distance-progress"
                ></progress>
              </div>
              @if (showActions()) {
                <div class="card-actions justify-end mt-2">
                  <a [routerLink]="['/shoes', shoe.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
                  <button type="button" class="btn btn-ghost btn-sm btn-error" (click)="onDeleteClicked(shoe)">
                    Delete
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ShoesGridPartComponent {
  readonly shoes = input<Shoe[]>([]);
  readonly loading = input(false);
  readonly error = input('');
  readonly showActions = input(true);
  readonly showAddLink = input(true);
  readonly addLink = input('/shoes/new');

  readonly deleteShoe = output<Shoe>();

  /** Effective target km for progress bar; 800 when shoe target is 0 (defensive). */
  protected effectiveTargetKm(shoe: Shoe): number {
    return shoe.kilometerTarget || 800;
  }

  /** Progress percentage (0–100) for distance vs effective target, capped at 100. */
  protected distanceProgressPercent(shoe: Shoe): number {
    const target = this.effectiveTargetKm(shoe);
    if (target <= 0) return 0;
    return Math.min(100, (shoe.totalDistanceKm / target) * 100);
  }

  protected onDeleteClicked(shoe: Shoe): void {
    this.deleteShoe.emit(shoe);
  }
}
