import { MainPO } from '../../../page-objects/MainPO';

export class RegisterPO extends MainPO {
  constructor() {
    super('[data-cy="register"]');
  }

  get emailInput() {
    return this.root.find('[data-cy="register-email"]');
  }

  get passwordInput() {
    return this.root.find('[data-cy="register-password"]');
  }

  get submitButton() {
    return this.root.find('[data-cy="register-submit"]');
  }

  get errorAlert() {
    return this.root.find('[data-cy="register-error"]');
  }

  get backToLoginLink() {
    return this.root.find('[data-cy="register-back-to-login"]');
  }

  register(email: string, password: string): void {
    this.emailInput.clear().type(email);
    this.passwordInput.clear().type(password);
    this.submitButton.click();
  }
}
