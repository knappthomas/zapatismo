import { MainPO } from '../../../page-objects/MainPO';

export class WorkoutFormPO extends MainPO {
  constructor() {
    super('[data-cy="workout-form-container"]');
  }

  get typeSelect() {
    return this.root.find('[data-cy="workout-type"]');
  }

  get startTimeInput() {
    return this.root.find('[data-cy="workout-start-time"]');
  }

  get endTimeInput() {
    return this.root.find('[data-cy="workout-end-time"]');
  }

  get stepsInput() {
    return this.root.find('[data-cy="workout-steps"]');
  }

  get distanceInput() {
    return this.root.find('[data-cy="workout-distance"]');
  }

  get locationInput() {
    return this.root.find('[data-cy="workout-location"]');
  }

  get shoeSelect() {
    return this.root.find('[data-cy="workout-shoe"]');
  }

  get submitButton() {
    return this.root.find('[data-cy="workout-submit"]');
  }

  get formError() {
    return this.root.find('[data-cy="workout-form-error"]');
  }
}
