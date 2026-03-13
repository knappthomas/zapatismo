import { MainPO } from '../../../page-objects/MainPO';

export class LoginPO extends MainPO {
  constructor() {
    super('[data-cy="login"]');
  }

  get emailInput() {
    return this.root.find('[data-cy="login-email"]');
  }

  get passwordInput() {
    return this.root.find('[data-cy="login-password"]');
  }

  get submitButton() {
    return this.root.find('[data-cy="login-submit"]');
  }

  get errorAlert() {
    return this.root.find('[data-cy="login-error"]');
  }

  get logoImage() {
    return this.root.find('[data-cy="login-logo"]');
  }

  login(email: string, password: string): void {
    this.emailInput.clear().type(email);
    this.passwordInput.clear().type(password);
    this.submitButton.click();
  }
}
