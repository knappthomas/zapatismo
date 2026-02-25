import { LoginPO } from './po/LoginPO';

describe('Login', () => {
  const po = new LoginPO();

  describe('Component Test', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      cy.visit('/login');
    });

    it('disables submit when email is empty or invalid or password is empty', () => {
      po.submitButton.should('be.disabled');
      po.emailInput.type('invalid');
      po.submitButton.should('be.disabled');
      po.emailInput.clear().type('user@example.com');
      po.submitButton.should('be.disabled');
      po.passwordInput.type('x');
      po.submitButton.should('not.be.disabled');
    });
  });

  describe('e2e', () => {
    describe('fixtures', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        cy.visit('/login');
      });

      it('successfully logs in and navigates to dashboard', () => {
        cy.intercept('POST', '/api/auth/login', { fixture: 'login/success.json' });
        po.login('user@example.com', 'password');
        cy.url().should('include', '/dashboard');
      });

      it('shows "Invalid email or password." on 401', () => {
        cy.intercept('POST', '/api/auth/login', {
          statusCode: 401,
          fixture: 'login/error-401.json',
        });
        po.login('user@example.com', 'wrong');
        po.errorAlert.should('be.visible').and('contain', 'Invalid email or password.');
        cy.url().should('include', '/login');
      });

      it('shows "Login failed. Please try again." on server error', () => {
        cy.intercept('POST', '/api/auth/login', {
          statusCode: 500,
          fixture: 'login/error-500.json',
        });
        po.login('user@example.com', 'password');
        po.errorAlert.should('be.visible').and('contain', 'Login failed. Please try again.');
        cy.url().should('include', '/login');
      });

      it('shows generic error on network failure', () => {
        cy.intercept('POST', '/api/auth/login', { forceNetworkError: true });
        po.login('user@example.com', 'password');
        po.errorAlert.should('be.visible').and('contain', 'Login failed. Please try again.');
        cy.url().should('include', '/login');
      });
    });

    describe('smoke', () => {
      it('loads the app and redirects unauthenticated users to login', () => {
        cy.visit('/');
        cy.url().should('include', '/login');
        cy.get('body').should('be.visible');
      });
    });
  });
});
