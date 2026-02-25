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
}
