import { RegisterPO } from './po/RegisterPO';

describe('Register', () => {
  const po = new RegisterPO();

  describe('Component Test', () => {
    it('login page shows link to registration form', () => {
      cy.clearLocalStorage();
      cy.visit('/login');
      cy.get('[data-cy="login-register-link"]').should('be.visible').and('have.attr', 'href', '/register');
    });

    it('disables submit when email is empty or invalid or password is too short', () => {
      cy.clearLocalStorage();
      cy.visit('/register');
      po.submitButton.should('be.disabled');
      po.emailInput.type('invalid');
      po.submitButton.should('be.disabled');
      po.emailInput.clear().type('user@example.com');
      po.passwordInput.type('short');
      po.submitButton.should('be.disabled');
      po.passwordInput.clear().type('longenough');
      po.submitButton.should('not.be.disabled');
    });

    it('shows back-to-login link', () => {
      cy.clearLocalStorage();
      cy.visit('/register');
      po.backToLoginLink.should('be.visible').and('have.attr', 'href', '/login');
    });
  });

  describe('e2e', () => {
    describe('fixtures', () => {
      it('navigating from login to register shows registration form', () => {
        cy.clearLocalStorage();
        cy.visit('/login');
        cy.get('[data-cy="login-register-link"]').click();
        cy.url().should('include', '/register');
        po.emailInput.should('be.visible');
        po.passwordInput.should('be.visible');
        po.submitButton.should('be.visible');
      });

      it('successful registration redirects to login with success message', () => {
        cy.intercept('POST', '/api/auth/register', { statusCode: 201, fixture: 'register/success.json' });
        cy.clearLocalStorage();
        cy.visit('/register');
        po.register('newuser@example.com', 'password8');
        cy.url().should('include', '/login').and('include', 'registered=1');
        cy.get('[data-cy="login-success"]').should('be.visible').and('contain', 'Account created. Please sign in.');
      });

      it('shows "This email is already registered." on 409', () => {
        cy.intercept('POST', '/api/auth/register', {
          statusCode: 409,
          fixture: 'register/error-409.json',
        });
        cy.clearLocalStorage();
        cy.visit('/register');
        po.register('existing@example.com', 'password8');
        po.errorAlert.should('be.visible').and('contain', 'This email is already registered.');
        cy.url().should('include', '/register');
      });

      it('shows validation message on 400', () => {
        cy.intercept('POST', '/api/auth/register', {
          statusCode: 400,
          fixture: 'register/error-400.json',
        });
        cy.clearLocalStorage();
        cy.visit('/register');
        po.emailInput.clear().type('bad-email');
        po.passwordInput.clear().type('short').blur();
        po.emailInput.should('have.class', 'ng-invalid');
        po.passwordInput.should('have.class', 'ng-invalid');
        cy.url().should('include', '/register');
      });
    });
  });
});
