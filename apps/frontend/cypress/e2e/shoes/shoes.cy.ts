import { ShoeFormPO } from './po/ShoeFormPO';
import { ShoesOverviewPO } from './po/ShoesOverviewPO';

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

describe('Shoes', () => {
  const formPO = new ShoeFormPO();
  const overviewPO = new ShoesOverviewPO();

  describe('Component Test', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      setFakeUserToken();
      cy.visit('/shoes/new');
    });

    it('shoe name input has maxlength 75', () => {
      formPO.shoeNameInput.should('have.attr', 'maxlength', '75');
    });

    it('brand input has maxlength 75', () => {
      formPO.brandInput.should('have.attr', 'maxlength', '75');
    });

    it('kilometer target input has max 100000 and min 0', () => {
      formPO.kilometerTargetInput.should('have.attr', 'max', '100000');
      formPO.kilometerTargetInput.should('have.attr', 'min', '0');
    });
  });

  describe('e2e', () => {
    describe('fixtures', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeUserToken();
      });

      it('overview shows empty state when list is empty', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.visit('/shoes');
        cy.contains('No shoes yet').should('be.visible');
        overviewPO.addShoeLink.should('be.visible');
      });

      it('overview shows shoes when list returns data', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.visit('/shoes');
        cy.contains('Pegasus 40').should('be.visible');
        cy.contains('Nike').should('be.visible');
      });

      it('grid shows distance progress bar per shoe', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.visit('/shoes');
        overviewPO.shoesGrid.should('be.visible');
        overviewPO.shoeDistanceProgress.first().should('be.visible');
      });

      it('grid does not show step count', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.visit('/shoes');
        overviewPO.shoesGrid.should('be.visible');
        overviewPO.shoeTotalSteps.should('not.exist');
      });

      it('overview shows default badge when list has one default shoe', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded-with-default.json' });
        cy.visit('/shoes');
        overviewPO.defaultBadges.should('have.length', 1).and('contain', 'Default');
      });

      it('edit shoe set as default then overview shows default badge', () => {
        cy.intercept('GET', '**/api/shoes/1', { fixture: 'shoes/shoe-1-no-default.json' });
        cy.intercept('PATCH', '**/api/shoes/1', { statusCode: 200, fixture: 'shoes/shoe-1-with-default.json' });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded-with-default.json' });
        cy.visit('/shoes/1/edit');
        formPO.defaultCheckbox.should('be.visible').and('not.be.checked');
        formPO.defaultCheckbox.check();
        formPO.submitButton.click();
        cy.url().should('include', '/shoes');
        overviewPO.defaultBadges.should('have.length', 1).and('contain', 'Default');
      });

      it('edit shoe clear default then overview shows no default badge', () => {
        cy.intercept('GET', '**/api/shoes/1', { fixture: 'shoes/shoe-1-with-default.json' });
        cy.intercept('PATCH', '**/api/shoes/1', { statusCode: 200, fixture: 'shoes/shoe-1-no-default.json' });
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/loaded.json' });
        cy.visit('/shoes/1/edit');
        formPO.defaultCheckbox.should('be.visible').and('be.checked');
        formPO.defaultCheckbox.uncheck();
        formPO.submitButton.click();
        cy.url().should('include', '/shoes');
        overviewPO.defaultBadges.should('have.length', 0);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        setFakeUserToken();
      });

      it('overview shows error when list returns 500', () => {
        cy.intercept('GET', '**/api/shoes', {
          statusCode: 500,
          fixture: 'shoes/error-500.json',
        });
        cy.visit('/shoes');
        overviewPO.errorAlert.should('be.visible').and('contain', 'Failed to load shoes.');
      });

      it('form shows validation error on create 400', () => {
        cy.intercept('GET', '**/api/shoes', { fixture: 'shoes/empty.json' });
        cy.intercept('POST', '**/api/shoes', {
          statusCode: 400,
          fixture: 'shoes/error-400.json',
        });
        cy.visit('/shoes/new');
        formPO.photoUrlInput.type('https://example.com/shoe.jpg');
        formPO.brandInput.type('Nike');
        formPO.shoeNameInput.type('Pegasus 40');
        formPO.buyingDateInput.type('2024-01-15');
        formPO.kilometerTargetInput.clear().type('800');
        formPO.submitButton.click();
        formPO.formError.should('be.visible').and('contain', 'photoUrl');
      });

      it('form shows error when get shoe returns 404', () => {
        cy.intercept('GET', '**/api/shoes/999', { statusCode: 404 });
        cy.visit('/shoes/999/edit');
        formPO.formError.should('be.visible').and('contain', 'Shoe not found.');
      });
    });

    describe('smoke', () => {
      // No additional smoke tests for shoes; one smoke lives in login per project rules.
    });
  });
});
