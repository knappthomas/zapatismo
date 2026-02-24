import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from './navbar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen flex flex-col">
      <app-navbar />
      <main class="flex-1 p-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class MainLayoutComponent {}
