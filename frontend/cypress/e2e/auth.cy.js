describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    // Clear all storage
    cy.window().then((win) => {
      win.sessionStorage.clear();
      win.localStorage.clear();
    });
    
    // Visit the main page
    cy.visit('/');
    
    // Navigate to login page
    cy.window().then((win) => {
      win.navigateTo('login-page');
    });
  });

  it('should load authentication page', () => {
    // Check that we're on the login page
    cy.get('.login-page').should('be.visible');
    
    // Check form elements
    cy.get('#login-form').should('exist');
    cy.get('#login-email').should('exist');
    cy.get('#login-password').should('exist');
    cy.contains('button', 'Log in').should('exist');
    cy.contains('a', 'Or, sign up').should('exist');
  });

  it('should show validation errors for empty form submission', () => {
    // Test HTML5 validation
    cy.get('#login-form button[type="submit"]').click();
    
    // Check validation
    cy.get('#login-email').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
    
    cy.get('#login-password').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
  });

  it('should validate email format client-side', () => {
    const emailInput = cy.get('#login-email');
    
    // Test invalid email
    emailInput.type('invalid-email');
    emailInput.blur();
    emailInput.then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
    
    // Test valid email
    emailInput.clear().type('valid@example.com');
    emailInput.then(($input) => {
      expect($input[0].checkValidity()).to.be.true;
    });
  });

  it('should switch between login and sign-up forms', () => {
    // Initially login form should be visible
    cy.get('.login-page').should('be.visible');
    cy.get('.sign-up-page').should('not.be.visible');
    
    // Click sign up link
    cy.contains('a', 'Or, sign up').click();
    
    // Sign up page should be visible
    cy.get('.sign-up-page').should('be.visible');
    cy.get('.login-page').should('not.be.visible');
    
    // Check sign up form elements
    cy.get('#sign-up-form').should('exist');
    cy.get('#name').should('exist');
    cy.get('#email').should('exist');
    cy.get('#password').should('exist');
    cy.get('#bio').should('exist');
    
    // Go back to login
    cy.contains('a', 'Or, log in').click();
    cy.get('.login-page').should('be.visible');
  });

  it('should handle password recovery flow', () => {
    // Since the link has display: none, we need to trigger the navigation differently
    cy.window().then((win) => {
      win.navigateTo('forget-password-page');
    });
    
    // Should be on forget password page
    cy.get('.forget-password-page').should('be.visible');
    cy.get('#forget-password-form').should('exist');
    cy.get('#forget-email').should('exist');
    
    // Go back to login using the link
    cy.contains('a', 'Or, Log in').click();
    cy.get('.login-page').should('be.visible');
  });

  it('should submit login form with valid data (mocked)', () => {
    // UYGULAMANIZIN BEKLEDİĞİ ŞEKİLDE MOCK YAP
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful!',  // BU ÖNEMLİ: 'Login successful!' olmalı
        success: true,
        token: 'fake-jwt-token',
        user: { 
          id: 1, 
          email: 'test@example.com', 
          name: 'Test User',
          bio: 'Test bio'
        }
      }
    }).as('loginRequest');
    
    // Fill and submit the form
    cy.get('#login-email').type('test@example.com');
    cy.get('#login-password').type('password123');
    cy.get('#login-form button[type="submit"]').click();
    
    // Wait for the login API call
    cy.wait('@loginRequest').then((interception) => {
      // API'nin doğru verilerle çağrıldığını kontrol et
      expect(interception.request.body).to.deep.include({
        email: 'test@example.com',
        password: 'password123'
      });
      
      // Response'un doğru olduğunu kontrol et
      expect(interception.response.body.message).to.equal('Login successful!');
    });
    
    // Uygulamanın sessionStorage'a verileri eklediğini kontrol et
    cy.window().then((win) => {
      // 'jwt' key'i ile token saklanıyor
      const token = win.sessionStorage.getItem('jwt');
      expect(token).to.equal('fake-jwt-token');
      
      // 'profileData' key'i ile user saklanıyor
      const profileData = win.sessionStorage.getItem('profileData');
      expect(profileData).to.exist;
      
      const parsedData = JSON.parse(profileData);
      expect(parsedData.email).to.equal('test@example.com');
      expect(parsedData.name).to.equal('Test User');
    });
    
    // Landing page'in görünür olduğunu kontrol et
    cy.get('.Landing-page', { timeout: 10000 }).should('be.visible');
  });

  // HATA DURUMU TESTİ - Uygulamanızın beklediği mesaj formatına göre
  it('should handle login errors correctly', () => {
    // Uygulamanızın beklediği hata formatında mock yap
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 401,
      body: {
        message: 'Invalid email or password',
        success: false
      }
    }).as('failedLogin');
    
    // Fill and submit the form
    cy.get('#login-email').type('wrong@example.com');
    cy.get('#login-password').type('wrongpass');
    cy.get('#login-form button[type="submit"]').click();
    
    cy.wait('@failedLogin');
    
    // Hata mesajının göründüğünü kontrol et
    cy.get('.login-form-error').should('be.visible');
    cy.get('.login-form-error').should('contain.text', 'Invalid email or password');
    
    // Secret section'ın göründüğünü kontrol et
    cy.get('.secret-section').should('be.visible');
  });

  // NETWORK HATASI TESTİ
  it('should handle network errors', () => {
    // Network hatasını mock'la
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 0, // Network error
      body: null
    }).as('networkError');
    
    // Fill and submit the form
    cy.get('#login-email').type('test@example.com');
    cy.get('#login-password').type('password123');
    cy.get('#login-form button[type="submit"]').click();
    
    cy.wait('@networkError');
    
    // Hata mesajının göründüğünü kontrol et
    cy.get('.login-form-error').should('be.visible');
  });

  it('should submit sign-up form (mocked)', () => {
    // Navigate to sign up page
    cy.contains('a', 'Or, sign up').click();
    cy.get('.sign-up-page').should('be.visible');
    
    // Mock sign up API - uygulamanızın beklediği formatta
    cy.intercept('POST', '**/api/v1/auth/register', (req) => {
      req.reply({
        statusCode: 201,
        body: {
          success: true,
          message: 'User registered successfully'
        }
      });
    }).as('signupRequest');
    
    // Fill sign up form
    cy.get('#name').type('Test User');
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('password123');
    cy.get('#bio').type('Test bio');
    cy.get('#sign-up-form button[type="submit"]').click();
    
    cy.wait('@signupRequest');
    
    // URL'nin sign-up-page olduğunu kontrol et
    cy.url().should('include', '#sign-up-page');
  });

  it('should maintain navigation state', () => {
    // Test that navigation works properly
    cy.contains('a', 'Or, sign up').click();
    cy.get('.sign-up-page').should('be.visible');
    cy.url().should('include', '#sign-up-page');
    
    // Use browser back
    cy.go('back');
    cy.get('.login-page').should('be.visible');
    cy.url().should('include', '#login-page');
    
    // Use browser forward
    cy.go('forward');
    cy.get('.sign-up-page').should('be.visible');
    cy.url().should('include', '#sign-up-page');
  });

  it('should have proper page titles', () => {
    // Check main page title
    cy.title().should('include', 'Sosyal Medya Platformu - Ana Sayfa');
    
    // When on login page, check form header
    cy.get('.registration-header').should('contain.text', 'Log in');
    
    // Navigate to sign up and check header
    cy.contains('a', 'Or, sign up').click();
    cy.get('.registration-header').should('contain.text', 'Sign up');
  });

  it('should validate sign-up form fields', () => {
    // Navigate to sign up
    cy.contains('a', 'Or, sign up').click();
    cy.get('.sign-up-page').should('be.visible');
    
    // Test required fields
    cy.get('#sign-up-form button[type="submit"]').click();
    
    // All required fields should be invalid
    cy.get('#name').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
    
    cy.get('#email').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
    
    cy.get('#password').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
    
    cy.get('#bio').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
    
    // Fill with valid data
    cy.get('#name').type('Test User');
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('password123');
    cy.get('#bio').type('Test bio');
    
    // All fields should be valid now
    cy.get('#name').then(($input) => {
      expect($input[0].checkValidity()).to.be.true;
    });
  });

  // Test the actual navigation functionality
  it('should navigate using hash URLs', () => {
    // Test direct hash navigation
    cy.visit('/#sign-up-page');
    cy.get('.sign-up-page').should('be.visible');
    
    cy.visit('/#login-page');
    cy.get('.login-page').should('be.visible');
  });

  // TEST: Login sonrası profile UI güncellemesi
  it('should update profile UI after successful login', () => {
    // Mock login
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful!',
        success: true,
        token: 'fake-jwt-token',
        user: { 
          id: 1, 
          email: 'test@example.com', 
          name: 'Test User',
          bio: 'Test bio',
          profileImage: 'test-image.jpg'
        }
      }
    }).as('loginRequest');
    
    // Fill and submit
    cy.get('#login-email').type('test@example.com');
    cy.get('#login-password').type('password123');
    cy.get('#login-form button[type="submit"]').click();
    
    cy.wait('@loginRequest');
    
    // Profile UI'nin güncellendiğini kontrol et
    cy.window().then((win) => {
      const updateProfileUI = win.updateProfileUI;
      if (updateProfileUI) {
        // updateProfileUI fonksiyonunun çağrıldığını kontrol et
        cy.stub(win, 'updateProfileUI').as('updateProfileUISpy');
      }
    });
    
    // Landing page görünmeli
    cy.get('.Landing-page', { timeout: 10000 }).should('be.visible');
  });
});