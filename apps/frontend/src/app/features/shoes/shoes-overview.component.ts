import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { Shoe } from '../../core/models/shoe.model';
import { ShoesService } from '../../core/services/shoes.service';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-shoes-overview',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="max-w-6xl mx-auto" data-cy="shoes-overview">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 class="text-3xl font-bold">Shoes</h1>
        <div class="flex items-center gap-2">
          <div class="join">
            <button
              type="button"
              class="btn btn-sm join-item"
              [class.btn-active]="viewMode() === 'grid'"
              (click)="viewMode.set('grid')"
              aria-label="Grid view"
            >
              Grid
            </button>
            <button
              type="button"
              class="btn btn-sm join-item"
              [class.btn-active]="viewMode() === 'list'"
              (click)="viewMode.set('list')"
              aria-label="List view"
            >
              List
            </button>
          </div>
          <a routerLink="/shoes/new" class="btn btn-primary btn-sm" data-cy="add-shoe">Add Shoe</a>
        </div>
      </div>

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
          <a routerLink="/shoes/new" class="btn btn-primary mt-4">Add Shoe</a>
        </div>
      } @else {
        @if (viewMode() === 'grid') {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (shoe of shoes(); track shoe.id) {
              <div class="card bg-base-200 shadow-sm">
                <figure class="h-40 bg-base-300">
                  <img [src]="shoe.photoUrl" [alt]="shoe.shoeName" class="object-cover w-full h-full" />
                </figure>
                <div class="card-body p-4">
                  <h2 class="card-title text-lg">{{ shoe.shoeName }}</h2>
                  <p class="text-sm text-base-content/80">{{ shoe.brandName }}</p>
                  <p class="text-sm">Target: {{ shoe.kilometerTarget }} km</p>
                  <div class="card-actions justify-end mt-2">
                    <a [routerLink]="['/shoes', shoe.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
                    <button type="button" class="btn btn-ghost btn-sm btn-error" (click)="openDeleteConfirm(shoe)">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Brand</th>
                  <th>Buying date</th>
                  <th>Location</th>
                  <th>Km target</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (shoe of shoes(); track shoe.id) {
                  <tr>
                    <td>
                      <img [src]="shoe.photoUrl" [alt]="shoe.shoeName" class="w-12 h-12 object-cover rounded" />
                    </td>
                    <td>{{ shoe.shoeName }}</td>
                    <td>{{ shoe.brandName }}</td>
                    <td>{{ shoe.buyingDate | date: 'mediumDate' }}</td>
                    <td>{{ shoe.buyingLocation ?? '—' }}</td>
                    <td>{{ shoe.kilometerTarget }} km</td>
                    <td>
                      <a [routerLink]="['/shoes', shoe.id, 'edit']" class="btn btn-ghost btn-sm">Edit</a>
                      <button type="button" class="btn btn-ghost btn-sm text-error" (click)="openDeleteConfirm(shoe)">
                        Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Delete confirmation modal -->
      @if (shoeToDelete()) {
        <dialog id="delete-shoe-modal" class="modal modal-open" open>
          <div class="modal-box">
            <h3 class="font-bold text-lg">Delete shoe?</h3>
            <p class="py-4">
              Are you sure you want to delete &quot;{{ shoeToDelete()!.shoeName }}&quot;? This cannot be undone.
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
export class ShoesOverviewComponent implements OnInit {
  private readonly shoesService = inject(ShoesService);

  protected readonly shoes = signal<Shoe[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly viewMode = signal<ViewMode>('grid');
  protected readonly shoeToDelete = signal<Shoe | null>(null);
  protected readonly deleting = signal(false);

  ngOnInit(): void {
    this.shoesService.getList().subscribe({
      next: (data) => {
        this.shoes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load shoes.');
        this.loading.set(false);
      },
    });
  }

  protected openDeleteConfirm(shoe: Shoe): void {
    this.shoeToDelete.set(shoe);
  }

  protected cancelDelete(): void {
    this.shoeToDelete.set(null);
  }

  protected confirmDelete(): void {
    const shoe = this.shoeToDelete();
    if (!shoe) return;
    this.deleting.set(true);
    this.shoesService.delete(shoe.id).subscribe({
      next: () => {
        this.shoes.update((list) => list.filter((s) => s.id !== shoe.id));
        this.shoeToDelete.set(null);
        this.deleting.set(false);
      },
      error: () => {
        this.error.set('Failed to delete shoe.');
        this.deleting.set(false);
      },
    });
  }
}
