import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PASSWORD_MIN_LENGTH } from '@zapatismo/validation-constants';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-base-200">
      <div class="card w-full max-w-sm bg-base-100 shadow-xl" data-cy="register">
        <div class="card-body">
          <h2 class="card-title justify-center text-2xl mb-4">Create account</h2>

          @if (errorMessage()) {
            <div role="alert" class="alert alert-error mb-4" data-cy="register-error">
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <fieldset [disabled]="loading()">
              <label class="form-control w-full mb-4">
                <span class="label">Email <span class="text-error">*</span></span>
                <input
                  type="email"
                  formControlName="email"
                  class="input input-bordered w-full"
                  placeholder="Email"
                  data-cy="register-email"
                  autocomplete="email"
                />
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <span class="label text-error text-sm">Please enter a valid email address.</span>
                }
              </label>

              <label class="form-control w-full mb-6">
                <span class="label">Password <span class="text-error">*</span></span>
                <input
                  type="password"
                  formControlName="password"
                  class="input input-bordered w-full"
                  placeholder="At least {{ PASSWORD_MIN_LENGTH }} characters"
                  data-cy="register-password"
                  autocomplete="new-password"
                />
                @if (form.get('password')?.invalid && form.get('password')?.touched) {
                  <span class="label text-error text-sm">Password must be at least {{ PASSWORD_MIN_LENGTH }} characters.</span>
                }
              </label>

              <button type="submit" class="btn btn-primary w-full mb-2" [disabled]="form.invalid" data-cy="register-submit">
                @if (loading()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Create account
              </button>
              <a routerLink="/login" class="btn btn-ghost w-full" data-cy="register-back-to-login">Back to sign in</a>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    this.auth.register({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login'], { queryParams: { registered: '1' } });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(err));
      },
    });
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 409) return 'This email is already registered.';
    const body = err.error;
    if (body?.message) {
      const msg = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      return msg;
    }
    return 'Registration failed. Please try again.';
  }
}
