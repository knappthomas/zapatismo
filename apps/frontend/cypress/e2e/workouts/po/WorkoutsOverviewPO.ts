import { MainPO } from '../../../page-objects/MainPO';

export class WorkoutsOverviewPO extends MainPO {
  constructor() {
    super('[data-cy="workouts-overview"]');
  }

  get addWorkoutLink() {
    return this.root.find('[data-cy="add-workout"]');
  }

  get deleteCancelButton() {
    return this.root.find('[data-cy="delete-cancel"]');
  }

  get deleteConfirmButton() {
    return this.root.find('[data-cy="delete-confirm"]');
  }

  get errorAlert() {
    return this.root.find('.alert-error');
  }

  get syncStravaButton() {
    return this.root.find('[data-cy="sync-strava"]');
  }

  get syncModal() {
    return this.root.find('[data-cy="sync-strava-modal"]');
  }

  get syncNoDefaultShoeWarning() {
    return this.root.find('[data-cy="sync-no-default-shoe-warning"]');
  }

  get syncFromDateInput() {
    return this.root.find('[data-cy="sync-from-date"]');
  }

  get syncConfirmButton() {
    return this.root.find('[data-cy="sync-confirm"]');
  }

  get syncCancelButton() {
    return this.root.find('[data-cy="sync-cancel"]');
  }
}
