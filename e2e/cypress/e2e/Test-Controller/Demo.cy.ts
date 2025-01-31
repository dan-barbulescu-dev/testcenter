import {
  loginSuperAdmin, openSampleWorkspace1, loginTestTaker, resetBackendData,
  useTestDB, credentialsControllerTest, visitLoginPage
} from '../utils';

// declared in Sampledata/CY_Test_Logins.xml-->Group:RunDemo
const TesttakerName = 'Test_Demo_Ctrl';
const TesttakerPassword = '123';

let startTime: number;
let endTime: number;
let elapsed: number;

describe('Navigation-& Testlet-Restrictions', { testIsolation: false }, () => {
  before(() => {
    resetBackendData();
    cy.clearLocalStorage();
    cy.clearCookies();
    useTestDB();
    visitLoginPage();
    loginTestTaker(TesttakerName, TesttakerPassword, 'test');
  });
  beforeEach(useTestDB);

  it('should be possible to choose a demo-mode booklet', () => {
    cy.contains(/^Startseite$/)
      .should('exist');
    cy.url()
      .should('include', '/u/1');
  });

  it('should be no unit menu is visible', () => {
    cy.get('[data-cy="unit-menu"]')
      .should('not.exist');
  });

  it('should be possible to enter the block. The password should already be filled in', () => {
    cy.get('[mattooltip="Weiter"]')
      .should('exist')
      .click();
    cy.contains('Aufgabenblock')
      .should('exist');
    cy.get('[data-cy="unlockUnit"]')
      .should('have.value', 'HASE');
    // Time restricted area has been entered. Start the timer
    cy.contains('OK').then(() => {
      startTime = new Date().getTime();
    })
      .click();
    cy.contains(/^Aufgabe1$/)
      .should('exist');
    cy.url()
      .should('include', '/u/2');
    cy.contains(/Die Bearbeitungszeit für diesen Abschnitt hat begonnen: 1 min/) // TODO use data-cy
      .should('exist');
  });

  it('should be possible to navigate to next unit without responses/presentation complete but with a message', () => {
    cy.get('[data-cy="unit-navigation-forward"]')
      .click();
    cy.contains('abgespielt')
      .should('exist');
    cy.contains(/^Aufgabe2$/)
      .should('exist');
    cy.url()
      .should('include', '/u/3');
    cy.get('[data-cy="unit-navigation-backward"]')
      .should('exist')
      .click();
    cy.contains(/^Aufgabe1$/)
      .should('exist');
  });

  it('should be possible to navigate to the next unit without responses complete but with a message', () => {
    cy.get('[data-cy="page-navigation-1"]')
      .should('exist')
      .click();
    cy.get('iframe')
      .its('0.contentDocument.body')
      .should('be.visible'); // TODO why does this take sos long?
    cy.get('[data-cy="unit-navigation-forward"]')
      .click();
    cy.contains(/.*bearbeitet.*/)
      .should('exist');
    cy.contains(/^Aufgabe2$/)
      .should('exist');
    cy.get('[data-cy="unit-navigation-backward"]')
      .click();
    cy.contains(/^Aufgabe1$/)
      .should('exist');
  });

  it('should be possible to navigate to the next unit when required fields have been filled', () => {
    cy.get('iframe')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then(cy.wrap)
      .find('[data-cy="TestController-radio1-Aufg1"]') // TODO use data-cy
      .click()
      .should('be.checked');
    cy.wait(1000); // so the answer gets saved
    cy.get('[data-cy="unit-navigation-forward"]')
      .click();
    cy.contains(/^Aufgabe2$/)
      .should('exist');
  });

  it('should be possible to navigate backwards and verify that the last answer is there', () => {
    cy.get('[data-cy="unit-navigation-backward"]')
      .click();
    cy.get('iframe')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then(cy.wrap)
      .find('[data-cy="TestController-radio1-Aufg1"]')
      .should('be.checked');
  });

  it('should give a warning message when the time is expired, but the block will not be locked.', () => {
    // Wait for remaining time of restricted area
    endTime = new Date().getTime();
    elapsed = endTime - startTime;
    cy.wait(credentialsControllerTest.DemoRestrTime - elapsed);
    cy.contains(/Die Bearbeitung des Abschnittes ist beendet./) // TODO use data-cy
      .should('exist');
    cy.contains(/^Aufgabe1$/)
      .should('exist');
  });

  it('should be possible to start the booklet again after exiting the test', () => {
    cy.get('[data-cy="logo"]')
      .click();
    cy.url()
      .should('eq', `${Cypress.config().baseUrl}/#/r/starter`);
    cy.get('[data-cy="booklet-RUNDEMO"]')
      .should('exist')
      .contains('Fortsetzen') // TODO use data-cy
      .click();
    cy.get('[data-cy="unit-navigation-forward"]')
      .should('exist');
  });

  it('should be no longer exists the last answers', () => {
    cy.get('[data-cy="unit-navigation-forward"]')
      .click();
    cy.get('[data-cy="unlockUnit"]');
    cy.contains('OK')
      .click();
    cy.contains(/^Aufgabe1$/)
      .should('exist');
    cy.contains(/Die Bearbeitungszeit für diesen Abschnitt hat begonnen: 1 min/) // TODO use data-cy
      .should('exist');
    cy.contains('Aufgabe1')
      .should('exist');
    cy.get('iframe')
      .its('0.contentDocument.body')
      .should('be.visible')
      .then(cy.wrap)
      .find('[data-cy="TestController-radio1-Aufg1"]')
      .should('not.be.checked');
  });

  it('should be possible to go back to the booklet view and check out', () => {
    cy.get('[data-cy="logo"]')
      .should('exist')
      .click();
    cy.url()
      .should('eq', `${Cypress.config().baseUrl}/#/r/starter`);
    cy.get('[data-cy="endTest-1"]')
      .should('not.exist');
    cy.get('[data-cy="logout"]')
      .should('exist')
      .click();
    cy.url()
      .should('eq', `${Cypress.config().baseUrl}/#/r/login/`);
  });

  it('should be no answer file in demo-mode', () => {
    loginSuperAdmin();
    openSampleWorkspace1();
    cy.get('[data-cy="Ergebnisse/Antworten"]') // TODO use data-cy
      .should('exist')
      .click();
    cy.wait(2000);
    cy.contains('rundemo')
      .should('not.exist');
  });
});
