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

      it('workouts list shows distance with exactly two decimal places', () => {
        cy.intercept('GET', '**/api/workouts', {
          body: [
            {
              id: 1,
              userId: 1,
              type: 'RUNNING',
              startTime: '2025-02-20T08:00:00.000Z',
              endTime: '2025-02-20T09:15:00.000Z',
              steps: 10000,
              distanceKm: 10.1234,
              location: 'Test Run',
              shoeId: null,
              shoe: null,
              createdAt: '2025-02-20T10:00:00.000Z',
              updatedAt: '2025-02-20T10:00:00.000Z',
            },
          ],
        });
        cy.visit('/workouts');
        cy.get('[data-cy="workouts-list"]').within(() => {
          // Locale may show 10.12 or 10,12
          cy.contains(/10[.,]12/).should('be.visible');
        });
      });

      it('sync modal shows warnings when user has no default running or walking shoe', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.intercept('GET', '**/api/strava/last-sync', { body: { lastSyncAt: null } });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.visit('/workouts');
        overviewPO.syncStravaButton.click();
        overviewPO.syncModal.should('be.visible');
        overviewPO.syncNoDefaultRunningShoeWarning
          .should('be.visible')
          .and('contain', 'No default running shoe set');
        overviewPO.syncNoDefaultWalkingShoeWarning
          .should('be.visible')
          .and('contain', 'No default walking shoe set');
      });

      it('sync modal shows no warning when user has default running and walking shoe', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.intercept('GET', '**/api/strava/last-sync', { body: { lastSyncAt: null } });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded-with-default.json' });
        cy.visit('/workouts');
        overviewPO.syncStravaButton.click();
        overviewPO.syncModal.should('be.visible');
        overviewPO.syncNoDefaultRunningShoeWarning.should('not.exist');
        overviewPO.syncNoDefaultWalkingShoeWarning.should('not.exist');
      });

      it('sync modal shows warnings when user has no shoes', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.intercept('GET', '**/api/strava/last-sync', { body: { lastSyncAt: null } });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.visit('/workouts');
        overviewPO.syncStravaButton.click();
        overviewPO.syncModal.should('be.visible');
        overviewPO.syncNoDefaultRunningShoeWarning
          .should('be.visible')
          .and('contain', 'No default running shoe set');
        overviewPO.syncNoDefaultWalkingShoeWarning
          .should('be.visible')
          .and('contain', 'No default walking shoe set');
      });

      it('overview shows select column and allows selecting rows', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.visit('/workouts');
        cy.get('[data-cy="workouts-list"]').should('be.visible');
        cy.get('[data-cy="workouts-select-all"]').should('be.visible');
        cy.get('[data-cy="workout-select-1"]').should('be.visible').check();
        cy.get('[data-cy="workout-select-1"]').should('be.checked');
      });

      it('toolbar with Assign Shoe visible when at least one workout selected', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.visit('/workouts');
        overviewPO.assignShoeToolbar.should('not.exist');
        cy.get('[data-cy="workout-select-1"]').check();
        overviewPO.assignShoeToolbar.should('be.visible');
        overviewPO.assignShoeButton.should('be.visible').and('contain', 'Assign Shoe');
      });

      it('toolbar hidden when no workout selected', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.visit('/workouts');
        cy.get('[data-cy="workout-select-1"]').check();
        overviewPO.assignShoeToolbar.should('be.visible');
        cy.get('[data-cy="workout-select-1"]').uncheck();
        overviewPO.assignShoeToolbar.should('not.exist');
      });

      it('assign-shoe modal shows shoes dropdown and confirm', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.visit('/workouts');
        cy.get('[data-cy="workout-select-1"]').check();
        overviewPO.assignShoeButton.click();
        overviewPO.assignShoeModal.should('be.visible');
        overviewPO.assignShoeModal.contains('Assign shoe to selected workouts').should('be.visible');
        overviewPO.assignShoeSelect.should('be.visible');
        overviewPO.assignShoeConfirm.should('be.visible').and('contain', 'Update');
        overviewPO.assignShoeCancel.should('be.visible');
        overviewPO.assignShoeSelect.select('1');
        overviewPO.assignShoeConfirm.should('not.be.disabled');
      });

      it('after bulk assign success modal closes and list shows assigned shoe', () => {
        let getWorkoutsCallCount = 0;
        cy.intercept('GET', '**/api/workouts', (req) => {
          getWorkoutsCallCount += 1;
          const fixture =
            getWorkoutsCallCount === 1 ? 'workouts/loaded.json' : 'workouts/loaded-after-assign.json';
          req.reply({ fixture });
        }).as('getWorkouts');
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.intercept('PATCH', '**/api/workouts/bulk-assign-shoe', { statusCode: 200, body: [] }).as(
          'bulkAssignShoe',
        );
        cy.visit('/workouts');
        cy.wait('@getWorkouts');
        cy.get('[data-cy="workout-select-2"]').check();
        overviewPO.assignShoeButton.click();
        overviewPO.assignShoeSelect.select('1');
        overviewPO.assignShoeConfirm.click();
        cy.wait('@bulkAssignShoe');
        overviewPO.assignShoeModal.should('not.exist');
        cy.get('[data-cy="workouts-list"]').within(() => {
          cy.contains('Central Park').closest('tr').contains('Nike').should('be.visible');
        });
      });

      it('closing assign-shoe modal without confirm does not call bulk-assign', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.intercept('PATCH', '**/api/workouts/bulk-assign-shoe', cy.spy().as('bulkAssignSpy'));
        cy.visit('/workouts');
        cy.get('[data-cy="workout-select-1"]').check();
        overviewPO.assignShoeButton.click();
        overviewPO.assignShoeModal.should('be.visible');
        overviewPO.assignShoeCancel.click();
        overviewPO.assignShoeModal.should('not.exist');
        cy.get('@bulkAssignSpy').should('not.have.been.called');
      });

      it('assign-shoe modal with no shoes disables confirm and shows message', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.visit('/workouts');
        cy.get('[data-cy="workout-select-1"]').check();
        overviewPO.assignShoeButton.click();
        overviewPO.assignShoeModal.should('be.visible');
        overviewPO.assignShoeNoShoes
          .should('be.visible')
          .and('contain', 'You have no shoes');
        overviewPO.assignShoeConfirm.should('be.disabled');
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

      it('assign-shoe modal shows error on bulk-assign failure', () => {
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.intercept('PATCH', '**/api/workouts/bulk-assign-shoe', {
          statusCode: 500,
          fixture: 'workouts/error-500.json',
        }).as('bulkAssignShoe');
        cy.visit('/workouts');
        cy.get('[data-cy="workout-select-1"]').check();
        overviewPO.assignShoeButton.click();
        overviewPO.assignShoeSelect.select('1');
        overviewPO.assignShoeConfirm.click();
        cy.wait('@bulkAssignShoe');
        overviewPO.assignShoeError.should('be.visible').and('contain', 'Internal server error');
        overviewPO.assignShoeModal.should('be.visible');
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
