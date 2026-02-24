import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="max-w-3xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Dashboard</h1>

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
    </div>
  `,
})
export class DashboardComponent {
  protected readonly user = inject(AuthService).currentUser;
}
