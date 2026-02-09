// Import commands.js
import './commands';

// Global before each test
beforeEach(() => {
  // Her testten önce cookies ve storage'ı temizle
  cy.clearCookies();
  cy.clearLocalStorage();
  
  // Fake timer'ları kullan
  cy.clock();
});
