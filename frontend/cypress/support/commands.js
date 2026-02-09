// Özel Cypress komutları
Cypress.Commands.add('visitLocalPage', (pageName) => {
  const pages = {
    'home': 'ForMobileTest.html',
    'auth': 'auth.html',
    'chat': 'landing/index.html',
    'account': 'account/index.html'
  };
  
  const page = pages[pageName] || pageName;
  cy.visit(page);
});

Cypress.Commands.add('typeLogin', (email, password) => {
  cy.get('#login-email').type(email || 'test@example.com');
  cy.get('#login-password').type(password || 'password123');
  cy.get('#login-btn').click();
});

Cypress.Commands.add('shouldContainText', (selector, text) => {
  cy.get(selector).should('contain.text', text);
});
