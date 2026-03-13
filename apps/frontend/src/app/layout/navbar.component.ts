import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="navbar bg-base-200 shadow-sm">
      <div class="flex-1">
        <a routerLink="/dashboard" class="btn btn-ghost gap-2 text-xl">
          <img src="/logo.png" alt="Zapatismo" class="h-8 w-auto object-contain" data-cy="navbar-logo" />
          Zapatismo
        </a>
      </div>
      <div class="flex-none gap-2">
        <ul class="menu menu-horizontal px-1">
          <li>
            <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          </li>
          @if (auth.hasRole('USER')) {
            <li>
              <a routerLink="/shoes" routerLinkActive="active">Shoes</a>
            </li>
            <li>
              <a routerLink="/workouts" routerLinkActive="active">Workouts</a>
            </li>
            <li>
              <a routerLink="/settings" routerLinkActive="active">Settings</a>
            </li>
          }
          @if (auth.hasRole('ADMIN')) {
            <li>
              <a routerLink="/users" routerLinkActive="active">Users</a>
            </li>
          }
        </ul>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost gap-2">
            <span>{{ auth.currentUser()?.email }}</span>
            <span class="badge badge-sm badge-outline">{{ auth.currentUser()?.role }}</span>
          </div>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-40 p-2 shadow">
            <li><button (click)="auth.logout()">Logout</button></li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
}
