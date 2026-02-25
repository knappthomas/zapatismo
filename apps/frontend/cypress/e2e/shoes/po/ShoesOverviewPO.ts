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

  /** Default shoe badge(s) in grid/list (visible when shoe.isDefault). */
  get defaultBadges() {
    return this.root.find('[data-cy="shoe-default-badge"]');
  }
}
