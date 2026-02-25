import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Shoe } from '../../core/models/shoe.model';

@Component({
  selector: 'app-shoes-grid-part',
  imports: [RouterLink],
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
              <h2 class="card-title text-lg">{{ shoe.shoeName }}</h2>
              <p class="text-sm text-base-content/80">{{ shoe.brandName }}</p>
              <p class="text-sm">Target: {{ shoe.kilometerTarget }} km</p>
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

  protected onDeleteClicked(shoe: Shoe): void {
    this.deleteShoe.emit(shoe);
  }
}
