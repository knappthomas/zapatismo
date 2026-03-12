import { MainPO } from '../../../page-objects/MainPO';

export class UserCreatePO extends MainPO {
  constructor() {
    super('[data-cy="user-create"]');
  }

  get emailInput() {
    return this.root.find('[data-cy="user-create-email"]');
  }

  get passwordInput() {
    return this.root.find('[data-cy="user-create-password"]');
  }

  get roleSelect() {
    return this.root.find('[data-cy="user-create-role"]');
  }

  get submitButton() {
    return this.root.find('[data-cy="user-create-submit"]');
  }

  get formError() {
    return this.root.find('[data-cy="user-create-form-error"]');
  }

  fillAndSubmit(email: string, password: string, role: 'USER' | 'ADMIN' = 'USER'): void {
    this.emailInput.clear().type(email);
    this.passwordInput.clear().type(password);
    this.roleSelect.select(role);
    this.submitButton.click();
  }
}
