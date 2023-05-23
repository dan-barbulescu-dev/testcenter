import {
  loginSuperAdmin, openSampleWorkspace, loginTestTaker, resetBackendData, logoutTestTaker,
  useTestDB, credentialsControllerTest, visitLoginPage, deleteDownloadsFolder, readTestResultFiles
} from '../utils';

const waitMaxSnackBarDisplayed = 10000;
// declared in Sampledata/CY_ControllerTest_Logins.xml-->Group:RunReview
const TesttakerName = 'Test_HotReturn_Ctrl';
const TesttakerPassword = '123';
const mode = 'hot-return';

let startTime: number;
let endTime: number;
let elapsed: number;

describe('Navigation-& Testlet-Restrictions', () => {
  before(resetBackendData);
  before(deleteDownloadsFolder);
  beforeEach(useTestDB);
  before(() => {
    useTestDB();
    visitLoginPage();
    loginTestTaker(TesttakerName, TesttakerPassword);
  });

  it('should be possible to choose a hot-return-mode booklet', () => {
    cy.intercept(`${Cypress.env('TC_API_URL')}/test/3/state`).as('testState');
    cy.intercept(`${Cypress.env('TC_API_URL')}/test/3/unit/UNIT.SAMPLE-100/state`).as('unitState');
    cy.intercept(`${Cypress.env('TC_API_URL')}/test/3/log`).as('testLog');
    cy.intercept(`${Cypress.env('TC_API_URL')}/test/3/commands`).as('commands');
    cy.get('[data-cy="booklet-RUNHOTRET"]')
      .should('exist')
      .click();
    cy.wait(['@testState', '@unitState', '@unitState', '@testLog', '@commands']);
    cy.contains('Startseite')
      .should('exist');
  });

  it('should be visible a unit menu', () => {
    cy.get('[data-cy="unit-menu"]')
      .should('exist');
  });

  it('should be not possible to enter the block if a incorrect password is entered', () => {
    cy.wait(1000);
    cy.get('[mattooltip="Weiter"]')
      .should('exist')
      .click();
    cy.contains('Aufgabenblock')
      .should('exist');
    cy.get('[data-cy="unlockUnit"]')
      .should('have.value', '');
    cy.get('[data-cy="unlockUnit"]')
      .type('Hund');
    cy.contains('OK')
      .click();
    cy.contains(/^Freigabewort.*stimmt nicht.*/)
      .should('exist');
    cy.contains('stimmt nicht', { timeout: waitMaxSnackBarDisplayed })
      .should('not.exist');
  });

  it('should be possible to enter the block if a correct password is entered', () => {
    cy.contains('Aufgabenblock')
      .should('exist');
    cy.get('[data-cy="unlockUnit"]')
      .should('have.value', '');
    cy.get('[data-cy="unlockUnit"]')
      .type('Hase');
    //   Time restricted area has been entered. Start the timer
    cy.contains('OK').then(() => {
      startTime = new Date().getTime();
    })
      .click();
    cy.contains(/^Aufgabe1$/)
      .should('exist');
    cy.contains(/^Die Bearbeitungszeit für diesen Abschnitt hat begonnen: 1 min$/)
      .should('exist');
    // wait until the message is no longer displayed
    cy.contains('Bearbeitungszeit', { timeout: waitMaxSnackBarDisplayed })
      .should('not.exist');
  });

  it('should be visible a countdown in the window header', () => {
    cy.contains('0:')
      .should('exist');
  });

  it('should be not possible to navigate to next unit without responses/presentation complete', () => {
    cy.get('[data-cy="unit-navigation-forward"]')
      .click();
    cy.contains(/^Aufgabe darf nicht verlassen werden$/)
      .should('exist');
    cy.contains(/.*vollständig abgespielt.*gescrollt.*/)
      .should('exist');
    cy.get('[data-cy="dialog-confirm"]')
      .should('exist')
      .click();
    // wait until the dialog is no longer displayed
    cy.contains('Es müssen erst', { timeout: waitMaxSnackBarDisplayed })
      .should('not.exist');
    cy.contains(/^Aufgabe1$/)
      .should('exist');
  });

  // it('should be possible to navigate to the next unit without responses complete but with a message', () => {
  //   cy.get('[data-cy="page-navigation-1"]')
  //     .should('exist')
  //     .click();
  //   cy.get('iframe')
  //     .its('0.contentDocument.body')
  //     .should('be.visible')
  //     .then(cy.wrap)
  //     .contains('Presentation complete')
  //     .should('exist');
  //   cy.wait(1000);
  //   cy.get('[data-cy="unit-navigation-forward"]')
  //     .click();
  //   cy.contains(/.*bearbeitet.*/)
  //     .should('exist');
  //   cy.contains(/.*abgespielt.*/)
  //     .should('not.exist');
  //   // wait until the message is no longer displayed
  //   cy.contains('bearbeitet', { timeout: waitMaxSnackBarDisplayed })
  //     .should('not.exist');
  //   cy.contains(/^Aufgabe2$/)
  //     .should('exist');
  //   cy.get('[data-cy="unit-navigation-backward"]')
  //     .click();
  //   cy.contains(/^Aufgabe1$/)
  //     .should('exist');
  // });

  // it('should be possible to navigate to the next unit when required fields have been filled', () => {
  //   cy.get('iframe')
  //     .its('0.contentDocument.body')
  //     .should('be.visible')
  //     .then(cy.wrap)
  //     .find('[data-cy="TestController-radio1-Aufg1"]')
  //     .should('exist')
  //     .click()
  //     .should('be.checked');
  //   cy.wait(1000);
  //   cy.get('[data-cy="unit-navigation-forward"]')
  //     .click();
  //   // set a different timeout for snack-bars, because the snack-bar will only be visible for a few seconds
  //   cy.contains(/.*bearbeitet.*/, { timeout: waitMaxSnackBarDisplayed })
  //     .should('not.exist');
  //   cy.contains(/^Aufgabe2$/)
  //     .should('exist');
  // });

  // it('should be possible to navigate backwards and verify that the last answer is there', () => {
  //   cy.get('[data-cy="unit-navigation-backward"]')
  //     .click();
  //   cy.contains(/^Aufgabe1$/)
  //     .should('exist');
  //   cy.get('iframe')
  //     .its('0.contentDocument.body')
  //     .should('be.visible')
  //     .then(cy.wrap)
  //     .find('[data-cy="TestController-radio1-Aufg1"]')
  //     .should('be.checked');
  // });

  // it('should be there a warning message when the time is expires, but the block will not be locked.', () => {
  //   // Wait for remaining time of restricted area
  //   endTime = new Date().getTime();
  //   elapsed = endTime - startTime;
  //   cy.wait(credentialsControllerTest.DemoRestrTime - elapsed);
  //   cy.contains(/^Die Bearbeitung des Abschnittes ist beendet.$/)
  //     .should('exist');
  //   // wait until the message is no longer displayed
  //   cy.contains('Bearbeitung', { timeout: waitMaxSnackBarDisplayed })
  //     .should('not.exist');
  //   // Aufgabe1 is visible, because the block is in demo-mode not blocked
  //   cy.contains(/^Aufgabe1$/)
  //     .should('exist');
  // });

  // it('should be possible to start the booklet again after exiting the test', () => {
  //   cy.get('[data-cy="logo"]')
  //     .click();
  //   cy.url()
  //     .should('eq', `${Cypress.config().baseUrl}/#/r/test-starter`);
  //   cy.get('[data-cy="booklet-RUNREVIEW"]')
  //     .should('exist')
  //     .contains('Fortsetzen')
  //     .click();
  //   cy.get('[data-cy="unit-navigation-forward"]')
  //     .should('exist');
  // });

  // it('should be no longer exists the last answers', () => {
  //   cy.get('[data-cy="unit-navigation-forward"]')
  //     .click();
  //   cy.get('[data-cy="unlockUnit"]');
  //   cy.contains('OK')
  //     .click();
  //   cy.contains(/^Aufgabe1$/)
  //     .should('exist');
  //   cy.contains('0:')
  //     .should('exist');
  //   cy.contains(/^Die Bearbeitungszeit für diesen Abschnitt hat begonnen: 1 min$/)
  //     .should('exist');
  //   // wait until the message is no longer displayed
  //   cy.contains('Bearbeitungszeit', { timeout: waitMaxSnackBarDisplayed })
  //     .should('not.exist');
  //   cy.contains('Aufgabe1')
  //     .should('exist');
  //   cy.get('iframe')
  //     .its('0.contentDocument.body')
  //     .should('be.visible')
  //     .then(cy.wrap)
  //     .find('[data-cy="TestController-radio1-Aufg1"]')
  //     .should('not.be.checked');
  // });

  // it('should be possible to go back to the booklet view and check out', () => {
  //   logoutTestTaker(mode);
  //   // wait until the message is no longer displayed
  //   cy.contains('Im Testmodus dürfte hier nicht weitergeblättert werden:')
  //     .should('exist');
  //   cy.contains('Im Testmodus dürfte hier nicht weitergeblättert werden:', { timeout: waitMaxSnackBarDisplayed })
  //     .should('not.exist');
  // });

  // it('should be there an answer file, but without responses', () => {
  //   loginSuperAdmin();
  //   openSampleWorkspace();
  //   cy.get('[data-cy="Ergebnisse/Antworten"]')
  //     .should('exist')
  //     .click();
  //   cy.contains('runrev')
  //     .should('exist');
  //   cy.get('[data-cy="results-checkbox1"]')
  //     .should('exist')
  //     .click();
  //   cy.get('[data-cy="download-responses"]')
  //     .should('exist')
  //     .click();
  //   // responses must be empty
  //   readTestResultFiles('responses')
  //     .then(responses => {
  //       expect(responses[1][5]).to.be.equal('[]');
  //     });
  // });

  // it('should be there no log file', () => {
  //   cy.get('[data-cy="results-checkbox1"]')
  //     .click();
  //   cy.get('[data-cy="download-logs"]')
  //     .should('exist')
  //     .click();
  //   cy.contains('Keine Daten verfügbar')
  //     .should('exist');
  //   // wait until the message is no longer displayed
  //   cy.contains('Keine Daten verfügbar', { timeout: waitMaxSnackBarDisplayed })
  //     .should('not.exist');
  // });

  // it('should be there a comment file with given comment', () => {
  //   cy.get('[data-cy="results-checkbox1"]')
  //     .click();
  //   cy.get('[data-cy="download-comments"]')
  //     .should('exist')
  //     .click();
  //   readTestResultFiles('reviews')
  //     .then(responses => {
  //       expect(responses[1][8]).to.be.equal('my name: its a new comment');
  //     });
  // });
});
