import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-base-200">
      <div class="card w-full max-w-sm bg-base-100 shadow-xl" data-cy="login">
        <div class="card-body">
          <img src="/logo.png" alt="Zapatismo" class="w-24 h-24 mx-auto mb-4 object-contain" data-cy="login-logo" />
          <h2 class="card-title justify-center text-2xl mb-4">Zapatismo</h2>

          @if (successMessage()) {
            <div role="status" class="alert alert-success mb-4" data-cy="login-success">
              <span>{{ successMessage() }}</span>
            </div>
          }
          @if (errorMessage()) {
            <div role="alert" class="alert alert-error mb-4" data-cy="login-error">
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <fieldset [disabled]="loading()">
              <label class="floating-label mb-4">
                <span>Email</span>
                <input
                  type="email"
                  formControlName="email"
                  class="input input-bordered w-full"
                  placeholder="Email"
                  data-cy="login-email"
                />
              </label>

              <label class="floating-label mb-6">
                <span>Password</span>
                <input
                  type="password"
                  formControlName="password"
                  class="input input-bordered w-full"
                  placeholder="Password"
                  data-cy="login-password"
                />
              </label>

              <button type="submit" class="btn btn-primary w-full" [disabled]="form.invalid" data-cy="login-submit">
                @if (loading()) {
                  <span class="loading loading-spinner loading-sm"></span>
                }
                Sign in
              </button>
              <p class="text-center mt-4 text-sm">
                <a routerLink="/register" class="link link-primary" data-cy="login-register-link">Create account</a>
              </p>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/dashboard');
      return;
    }
    const registered = this.route.snapshot.queryParamMap.get('registered');
    if (registered === '1') {
      this.successMessage.set('Account created. Please sign in.');
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    this.auth.login({ email, password }).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.status === 401 ? 'Invalid email or password.' : 'Login failed. Please try again.',
        );
      },
    });
  }
}
