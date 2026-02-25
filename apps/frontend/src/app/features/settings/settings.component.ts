import { Component, inject, OnInit, signal } from '@angular/core';

import { StravaService } from '../../core/services/strava.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="max-w-2xl mx-auto" data-cy="settings-page">
      <h1 class="text-3xl font-bold mb-6">Settings</h1>

      <!-- Strava section -->
      <section class="card bg-base-200 shadow-sm" data-cy="strava-section">
        <div class="card-body">
          <h2 class="card-title">Strava</h2>
          <p class="text-sm text-base-content/70">
            Connect your Strava account to sync running and walking workouts into the portal.
          </p>

          @if (statusLoading()) {
            <div class="flex items-center gap-2 py-2">
              <span class="loading loading-spinner loading-sm"></span>
              <span>Loading connection status…</span>
            </div>
          } @else {
            <div class="flex flex-wrap items-center gap-3 py-2">
              <span class="font-medium">Status:</span>
              @if (connected()) {
                <span class="badge badge-success" data-cy="strava-connected">Connected</span>
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  [disabled]="disconnecting()"
                  (click)="disconnect()"
                  data-cy="strava-disconnect"
                >
                  @if (disconnecting()) {
                    <span class="loading loading-spinner loading-sm"></span>
                  }
                  Disconnect Strava
                </button>
              } @else {
                <span class="badge badge-ghost" data-cy="strava-not-connected">Not connected</span>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  [disabled]="connecting()"
                  (click)="connect()"
                  data-cy="strava-connect"
                >
                  @if (connecting()) {
                    <span class="loading loading-spinner loading-sm"></span>
                  }
                  Connect Strava
                </button>
              }
            </div>
          }

          @if (stravaError()) {
            <div role="alert" class="alert alert-error mt-2" data-cy="strava-error">
              <span>{{ stravaError() }}</span>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly stravaService = inject(StravaService);

  protected readonly connected = signal(false);
  protected readonly statusLoading = signal(true);
  protected readonly stravaError = signal('');
  protected readonly connecting = signal(false);
  protected readonly disconnecting = signal(false);

  ngOnInit(): void {
    this.loadStatus();
  }

  private loadStatus(): void {
    this.statusLoading.set(true);
    this.stravaError.set('');
    this.stravaService.getStatus().subscribe({
      next: (res) => {
        this.connected.set(res.connected);
        this.statusLoading.set(false);
      },
      error: (err) => {
        this.stravaError.set(this.messageFromError(err));
        this.statusLoading.set(false);
      },
    });
  }

  protected connect(): void {
    this.connecting.set(true);
    this.stravaError.set('');
    this.stravaService.getAuthorizeUrl().subscribe({
      next: (res) => {
        window.location.href = res.url;
        // Navigation away; connecting stays true until page unload
      },
      error: (err) => {
        this.stravaError.set(this.messageFromError(err));
        this.connecting.set(false);
      },
    });
  }

  protected disconnect(): void {
    this.disconnecting.set(true);
    this.stravaError.set('');
    this.stravaService.disconnect().subscribe({
      next: () => {
        this.connected.set(false);
        this.disconnecting.set(false);
      },
      error: (err) => {
        this.stravaError.set(this.messageFromError(err));
        this.disconnecting.set(false);
      },
    });
  }

  private messageFromError(err: unknown): string {
    if (err && typeof err === 'object') {
      const o = err as Record<string, unknown>;
      const e = o['error'];
      if (e && typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
        return (e as { message: string }).message;
      }
      if (typeof o['message'] === 'string') return o['message'];
    }
    return 'Something went wrong. Please try again.';
  }
}
