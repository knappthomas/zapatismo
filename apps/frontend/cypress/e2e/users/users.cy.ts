import { UserCreatePO } from './po/UserCreatePO';
import { UsersOverviewPO } from './po/UsersOverviewPO';

/** Build a minimal JWT payload (role ADMIN) so the app allows access to /users and /users/new. No real server. */
function setFakeAdminToken(): void {
  const payload = {
    sub: 1,
    email: 'admin@test.local',
    role: 'ADMIN',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  const token = `${headerB64}.${payloadB64}.fake`;
  cy.window().then((win) => {
    win.localStorage.setItem('access_token', token);
  });
}

describe('Users', () => {
  const overviewPO = new UsersOverviewPO();
  const createPO = new UserCreatePO();

  describe('Component Test', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      setFakeAdminToken();
      cy.visit('/users/new');
    });

    it('create form has email, password, and role fields', () => {
      createPO.emailInput.should('be.visible');
      createPO.passwordInput.should('be.visible');
      createPO.roleSelect.should('be.visible').and('have.value', 'USER');
      createPO.submitButton.should('be.visible');
    });

    it('submit is disabled when email is empty or invalid or password too short', () => {
      createPO.submitButton.should('be.disabled');
      createPO.emailInput.type('invalid');
      createPO.passwordInput.type('eight!!');
      createPO.submitButton.should('be.disabled');
      createPO.emailInput.clear().type('user@example.com');
      createPO.submitButton.should('be.disabled');
      createPO.passwordInput.clear().type('short');
      createPO.submitButton.should('be.disabled');
      createPO.passwordInput.clear().type('validpass');
      createPO.submitButton.should('not.be.disabled');
    });
  });

  describe('e2e', () => {
    describe('fixtures', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeAdminToken();
      });

      it('overview shows "Nutzer anlegen" when list is loaded', () => {
        cy.intercept('GET', '**/api/users', { fixture: 'users/loaded.json' });
        cy.visit('/users');
        overviewPO.createUserLink.should('be.visible').and('contain', 'Nutzer anlegen');
        overviewPO.usersTableWrapper.should('be.visible');
        cy.contains('admin@zapatismo.local').should('be.visible');
      });

      it('create user with valid data then redirects and list shows new user', () => {
        let getUsersCallCount = 0;
        cy.intercept('GET', '**/api/users', (req) => {
          getUsersCallCount += 1;
          if (getUsersCallCount === 1) req.reply({ fixture: 'users/loaded.json' });
          else req.reply({ fixture: 'users/loaded-with-new.json' });
        });
        cy.intercept('POST', '**/api/users', { statusCode: 201, fixture: 'users/created.json' }).as('createUser');
        cy.visit('/users');
        overviewPO.createUserLink.click();
        cy.url().should('include', '/users/new');
        createPO.fillAndSubmit('newuser@test.local', 'password8', 'USER');
        cy.wait('@createUser');
        cy.url().should('include', '/users').and('not.include', '/users/new');
        overviewPO.successAlert.should('be.visible').and('contain', 'erfolgreich angelegt');
        cy.contains('newuser@test.local').should('be.visible');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeAdminToken();
      });

      it('form shows duplicate-email error on 409', () => {
        cy.intercept('GET', '**/api/users', { fixture: 'users/loaded.json' });
        cy.intercept('POST', '**/api/users', {
          statusCode: 409,
          fixture: 'users/error-409.json',
        });
        cy.visit('/users/new');
        createPO.fillAndSubmit('admin@zapatismo.local', 'password8', 'USER');
        createPO.formError
          .should('be.visible')
          .and('contain', 'Diese E-Mail-Adresse wird bereits verwendet');
        cy.url().should('include', '/users/new');
      });

      it('overview shows error when list returns 500', () => {
        cy.intercept('GET', '**/api/users', {
          statusCode: 500,
          fixture: 'users/error-500.json',
        });
        cy.visit('/users');
        overviewPO.errorAlert.should('be.visible').and('contain', 'Failed to load users.');
      });
    });

    describe('smoke', () => {
      // No additional smoke tests for users; one smoke lives in login per project rules.
    });
  });
});
