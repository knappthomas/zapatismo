import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { User } from '../../core/models/user.model';
import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-user-list',
  imports: [DatePipe],
  template: `
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Users</h1>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else if (error()) {
        <div role="alert" class="alert alert-error">
          <span>{{ error() }}</span>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>{{ user.id }}</td>
                  <td>{{ user.email }}</td>
                  <td><span class="badge badge-outline badge-sm">{{ user.role }}</span></td>
                  <td>{{ user.createdAt | date: 'medium' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.usersService.getAll().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load users.');
        this.loading.set(false);
      },
    });
  }
}
