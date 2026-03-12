import { MainPO } from '../../../page-objects/MainPO';

export class ShoesOverviewPO extends MainPO {
  constructor() {
    super('[data-cy="shoes-overview"]');
  }

  get addShoeLink() {
    return this.root.find('[data-cy="add-shoe"]');
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

  get shoesGrid() {
    return this.root.find('[data-cy="shoes-grid"]');
  }

  /** All step count elements in the grid (scoped to overview). */
  get shoeTotalSteps() {
    return this.root.find('[data-cy="shoe-total-steps"]');
  }

  /** All distance progress bar elements in the grid (scoped to overview). */
  get shoeDistanceProgress() {
    return this.root.find('[data-cy="shoe-distance-progress"]');
  }

  /** Default Running badge(s) in grid/list. */
  get defaultRunningBadges() {
    return this.root.find('[data-cy="shoe-default-running-badge"]');
  }

  /** Default Walking badge(s) in grid/list. */
  get defaultWalkingBadges() {
    return this.root.find('[data-cy="shoe-default-walking-badge"]');
  }

  /** Any default badge (running or walking) in grid/list. */
  get defaultBadges() {
    return this.root.find('[data-cy="shoe-default-running-badge"], [data-cy="shoe-default-walking-badge"]');
  }
}
