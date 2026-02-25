import { WorkoutFormPO } from './po/WorkoutFormPO';
import { WorkoutsOverviewPO } from './po/WorkoutsOverviewPO';
import { LoginPO } from '../login/po/LoginPO';

/** Build a minimal JWT payload (role USER) so the app treats the user as logged in. No real server. */
function setFakeUserToken(): void {
  const payload = {
    sub: 1,
    email: 'user@test.local',
    role: 'USER',
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

describe('Workouts', () => {
  const formPO = new WorkoutFormPO();
  const overviewPO = new WorkoutsOverviewPO();
  const loginPO = new LoginPO();

  describe('e2e', () => {
    describe('fixtures', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeUserToken();
      });

      it('overview shows empty state when list is empty', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/empty.json' });
        cy.visit('/workouts');
        cy.contains('No workouts yet').should('be.visible');
        overviewPO.addWorkoutLink.should('be.visible');
      });

      it('overview shows workouts when list returns data', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.visit('/workouts');
        cy.contains('Villach Park').should('be.visible');
        cy.contains('Central Park').should('be.visible');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeUserToken();
      });

      it('overview shows error when list returns 500', () => {
        cy.intercept('GET', '**/api/workouts', {
          statusCode: 500,
          fixture: 'workouts/error-500.json',
        });
        cy.visit('/workouts');
        overviewPO.errorAlert.should('be.visible').and('contain', 'Failed to load workouts.');
      });

      it('form shows error on create 400', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.intercept('POST', '**/api/workouts', {
          statusCode: 400,
          fixture: 'workouts/error-400.json',
        });
        cy.visit('/workouts/new');
        formPO.typeSelect.select('RUNNING');
        formPO.startTimeInput.type('2025-02-25T08:00');
        formPO.endTimeInput.type('2025-02-25T09:00');
        formPO.stepsInput.clear().type('5000');
        formPO.distanceInput.clear().type('10');
        formPO.locationInput.type('Test Location');
        formPO.submitButton.click();
        formPO.formError.should('be.visible').and('contain', 'endTime');
      });
    });

    describe('smoke', () => {
      /**
       * Full workout CRUD flow against real backend.
       * Requires: backend running, DB with migrations and test-migrations applied.
       * Uses thomas@zapatismo.local / thomas (from prisma/test-migrations).
       */
      it('create workout → verify in overview → edit all data → delete workout', () => {
        const uniqueLocation = `E2E Smoke ${Date.now()}`;
        const updatedLocation = `E2E Smoke Updated ${Date.now()}`;

        cy.visit('/login');
        loginPO.emailInput.clear().type('thomas@zapatismo.local');
        loginPO.passwordInput.clear().type('thomas');
        loginPO.submitButton.click();
        cy.url().should('include', '/dashboard');

        cy.visit('/workouts');
        overviewPO.addWorkoutLink.click();
        cy.url().should('include', '/workouts/new');

        formPO.typeSelect.select('WALKING');
        formPO.startTimeInput.type('2025-02-25T08:00');
        formPO.endTimeInput.type('2025-02-25T09:00');
        formPO.stepsInput.clear().type('5000');
        formPO.distanceInput.clear().type('5.5');
        formPO.locationInput.type(uniqueLocation);
        formPO.submitButton.click();

        cy.url().should('include', '/workouts');
        cy.contains(uniqueLocation).should('be.visible');

        cy.contains('tr', uniqueLocation).contains('a', 'Edit').click();
        cy.url().should('match', /\/workouts\/\d+\/edit/);

        formPO.typeSelect.select('RUNNING');
        formPO.startTimeInput.clear().type('2025-02-26T07:00');
        formPO.endTimeInput.clear().type('2025-02-26T08:30');
        formPO.stepsInput.clear().type('6000');
        formPO.distanceInput.clear().type('6.2');
        formPO.locationInput.clear().type(updatedLocation);
        formPO.submitButton.click();

        cy.url().should('include', '/workouts');
        cy.contains(updatedLocation).should('be.visible');

        cy.contains('tr', updatedLocation).contains('button', 'Delete').click();
        overviewPO.deleteConfirmButton.click();

        cy.contains(updatedLocation).should('not.exist');
      });
    });
  });
});
