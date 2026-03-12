import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { UsersService } from '../../core/services/users.service';
import { Role } from '../../core/models/user.model';

const PASSWORD_MIN_LENGTH = 8;

@Component({
  selector: 'app-user-create',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto" data-cy="user-create">
      <h1 class="text-3xl font-bold mb-6">Nutzer anlegen</h1>

      @if (formError()) {
        <div role="alert" class="alert alert-error mb-4" data-cy="user-create-form-error">
          <span>{{ formError() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <fieldset [disabled]="saving()">
          <label class="form-control w-full mb-4">
            <span class="label">E-Mail <span class="text-error">*</span></span>
            <input
              data-cy="user-create-email"
              type="email"
              formControlName="email"
              class="input input-bordered w-full"
              placeholder="nutzer@beispiel.de"
              autocomplete="email"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="label text-error text-sm">Bitte eine gültige E-Mail-Adresse eingeben.</span>
            }
          </label>

          <label class="form-control w-full mb-4">
            <span class="label">Passwort <span class="text-error">*</span></span>
            <input
              data-cy="user-create-password"
              type="password"
              formControlName="password"
              class="input input-bordered w-full"
              placeholder="Mindestens 8 Zeichen"
              autocomplete="new-password"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="label text-error text-sm">Passwort muss mindestens {{ PASSWORD_MIN_LENGTH }} Zeichen haben.</span>
            }
          </label>

          <label class="form-control w-full mb-6">
            <span class="label">Rolle</span>
            <select data-cy="user-create-role" formControlName="role" class="select select-bordered w-full">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>

          <div class="flex gap-2">
            <button data-cy="user-create-submit" type="submit" class="btn btn-primary" [disabled]="form.invalid">
              @if (saving()) {
                <span class="loading loading-spinner loading-sm"></span>
              }
              Anlegen
            </button>
            <a routerLink="/users" class="btn btn-ghost">Abbrechen</a>
          </div>
        </fieldset>
      </form>
    </div>
  `,
})
export class UserCreateComponent {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    role: ['USER' as Role, Validators.required],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');

    const raw = this.form.getRawValue();
    this.usersService
      .create({
        email: raw.email,
        password: raw.password,
        role: raw.role,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/users'], { queryParams: { success: 'new' } });
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.errorMessage(err));
        },
      });
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 409) return 'Diese E-Mail-Adresse wird bereits verwendet.';
    const body = err.error;
    if (body?.message) {
      const msg = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      return msg;
    }
    return 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.';
  }
}
