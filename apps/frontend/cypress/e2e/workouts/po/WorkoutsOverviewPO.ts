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
}
