import { MainPO } from '../../../page-objects/MainPO';

export class ShoeFormPO extends MainPO {
  constructor() {
    super('[data-cy="shoe-form-container"]');
  }

  get photoUrlInput() {
    return this.root.find('[data-cy="shoe-photo-url"]');
  }

  get brandInput() {
    return this.root.find('[data-cy="shoe-brand"]');
  }

  get shoeNameInput() {
    return this.root.find('[data-cy="shoe-name"]');
  }

  get buyingDateInput() {
    return this.root.find('[data-cy="shoe-buying-date"]');
  }

  get buyingLocationInput() {
    return this.root.find('[data-cy="shoe-buying-location"]');
  }

  get kilometerTargetInput() {
    return this.root.find('[data-cy="shoe-kilometer-target"]');
  }

  get submitButton() {
    return this.root.find('[data-cy="shoe-submit"]');
  }

  get formError() {
    return this.root.find('[data-cy="shoe-form-error"]');
  }
}
