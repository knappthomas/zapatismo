import { DashboardPO } from './po/DashboardPO';

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

describe('Dashboard', () => {
  const dashboardPO = new DashboardPO();

  describe('Component Test', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      setFakeUserToken();
      cy.visit('/dashboard');
    });

    it('shows dashboard heading', () => {
      cy.contains('h1', 'Dashboard').should('be.visible');
    });

    it('shows My Shoes and Recent Workouts sections for USER role', () => {
      cy.contains('h2', 'My Shoes').should('be.visible');
      cy.contains('h2', 'Recent Workouts').should('be.visible');
    });

    it('shows navbar logo with alt text Zapatismo and brand link navigates to dashboard', () => {
      cy.get('[data-cy="navbar-logo"]').should('be.visible').and('have.attr', 'alt', 'Zapatismo');
      cy.get('[data-cy="navbar-logo"]').parent('a').click();
      cy.url().should('include', '/dashboard');
    });
  });

  describe('e2e', () => {
    describe('fixtures', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeUserToken();
      });

      it('shows empty state when shoes and workouts are empty', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/empty.json' });
        cy.visit('/dashboard');
        cy.contains('No shoes yet').should('be.visible');
        cy.contains('No workouts yet').should('be.visible');
      });

      it('shows shoes grid when shoes return data', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/empty.json' });
        cy.visit('/dashboard');
        dashboardPO.shoesGrid.should('be.visible');
        cy.contains('Pegasus 40').should('be.visible');
        cy.contains('Nike').should('be.visible');
      });

      it('shows workouts list when workouts return data', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/loaded.json' });
        cy.visit('/dashboard');
        dashboardPO.workoutsList.should('be.visible');
        cy.contains('Villach Park').should('be.visible');
        cy.contains('Central Park').should('be.visible');
      });

      it('View all links navigate to shoes and workouts pages', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/empty.json' });
        cy.visit('/dashboard');
        dashboardPO.viewAllShoesLink.click();
        cy.url().should('include', '/shoes');
        cy.visit('/dashboard');
        dashboardPO.viewAllWorkoutsLink.click();
        cy.url().should('include', '/workouts');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeUserToken();
      });

      it('shows error when shoes API returns 500', () => {
        cy.intercept('GET', '**/api/shoes', { statusCode: 500, body: {} });
        cy.intercept('GET', '**/api/workouts', { fixture: 'workouts/empty.json' });
        cy.visit('/dashboard');
        cy.contains('Failed to load shoes.').should('be.visible');
      });

      it('shows error when workouts API returns 500', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.intercept('GET', '**/api/workouts', { statusCode: 500, body: {} });
        cy.visit('/dashboard');
        cy.contains('Failed to load workouts.').should('be.visible');
      });
    });

    describe('smoke', () => {
      // One smoke test only in repo (login.cy.ts). Dashboard covered by fixtures.
    });
  });
});
