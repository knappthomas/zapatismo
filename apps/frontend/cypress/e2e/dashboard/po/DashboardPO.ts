import { MainPO } from '../../../page-objects/MainPO';

export class DashboardPO extends MainPO {
  constructor() {
    super('[data-cy="dashboard"]');
  }

  get shoesSection() {
    return this.root.find('[data-cy="dashboard-shoes"]');
  }

  get workoutsSection() {
    return this.root.find('[data-cy="dashboard-workouts"]');
  }

  get shoesGrid() {
    return this.root.find('[data-cy="shoes-grid"]');
  }

  get workoutsList() {
    return this.root.find('[data-cy="workouts-list"]');
  }

  get viewAllShoesLink() {
    return this.root.find('[data-cy="view-all-shoes"]');
  }

  get viewAllWorkoutsLink() {
    return this.root.find('[data-cy="view-all-workouts"]');
  }
}
