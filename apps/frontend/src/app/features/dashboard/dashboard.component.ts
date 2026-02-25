import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { Shoe } from '../../core/models/shoe.model';
import { Workout } from '../../core/models/workout.model';
import { ShoesService } from '../../core/services/shoes.service';
import { WorkoutsService } from '../../core/services/workouts.service';
import { ShoesGridPartComponent } from '../shoes/shoes-grid-part.component';
import { WorkoutsListPartComponent } from '../workouts/workouts-list-part.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ShoesGridPartComponent, WorkoutsListPartComponent],
  template: `
    <div class="max-w-6xl mx-auto" data-cy="dashboard">
      <h1 class="text-3xl font-bold mb-6">Dashboard</h1>

      @if (auth.hasRole('USER')) {
        <!-- User dashboard: shoes grid + workouts list -->
        <div class="space-y-10">
          <section data-cy="dashboard-shoes">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 class="text-xl font-semibold">My Shoes</h2>
              <a routerLink="/shoes" class="btn btn-ghost btn-sm" data-cy="view-all-shoes">View all</a>
            </div>
            <app-shoes-grid-part
              [shoes]="shoes()"
              [loading]="shoesLoading()"
              [error]="shoesError()"
              [showActions]="false"
              [showAddLink]="true"
            />
          </section>

          <section data-cy="dashboard-workouts">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 class="text-xl font-semibold">Recent Workouts</h2>
              <a routerLink="/workouts" class="btn btn-ghost btn-sm" data-cy="view-all-workouts">View all</a>
            </div>
            <app-workouts-list-part
              [workouts]="workouts()"
              [loading]="workoutsLoading()"
              [error]="workoutsError()"
              [showActions]="false"
              [showAddLink]="true"
            />
          </section>
        </div>
      } @else {
        <!-- Admin dashboard: simple welcome -->
        <div class="card bg-base-100 shadow-md">
          <div class="card-body">
            <h2 class="card-title">Welcome back</h2>
            <p class="text-base-content/70">
              Signed in as
              <span class="font-semibold">{{ user()?.email }}</span>
              <span class="badge badge-outline badge-sm ml-2">{{ user()?.role }}</span>
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly user = this.auth.currentUser;
  private readonly shoesService = inject(ShoesService);
  private readonly workoutsService = inject(WorkoutsService);

  protected readonly shoes = signal<Shoe[]>([]);
  protected readonly shoesLoading = signal(true);
  protected readonly shoesError = signal('');
  protected readonly workouts = signal<Workout[]>([]);
  protected readonly workoutsLoading = signal(true);
  protected readonly workoutsError = signal('');

  ngOnInit(): void {
    if (this.auth.hasRole('USER')) {
      this.shoesService.getList().subscribe({
        next: (data) => {
          this.shoes.set(data);
          this.shoesLoading.set(false);
        },
        error: () => {
          this.shoesError.set('Failed to load shoes.');
          this.shoesLoading.set(false);
        },
      });

      this.workoutsService.getList().subscribe({
        next: (data) => {
          this.workouts.set(data);
          this.workoutsLoading.set(false);
        },
        error: () => {
          this.workoutsError.set('Failed to load workouts.');
          this.workoutsLoading.set(false);
        },
      });
    } else {
      this.shoesLoading.set(false);
      this.workoutsLoading.set(false);
    }
  }
}
