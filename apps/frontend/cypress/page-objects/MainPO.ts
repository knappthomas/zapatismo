/**
 * Base Page Object for all Cypress E2E page objects.
 * Extend this class for every page/screen; add shared helpers here over time.
 * Root is a getter so cy.get() runs inside the test, not at describe/load time.
 */
export class MainPO {
  private readonly rootSelector: string | undefined;

  /**
   * Root element for this page (or document body for full-page POs).
   * Evaluated when accessed so Cypress commands run inside a test.
   */
  protected get root(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.rootSelector ? cy.get(this.rootSelector) : cy.get('body');
  }

  /**
   * @param rootSelector - Optional selector for the page root. Omit for full-page (uses body).
   */
  constructor(rootSelector?: string) {
    this.rootSelector = rootSelector;
  }
}
