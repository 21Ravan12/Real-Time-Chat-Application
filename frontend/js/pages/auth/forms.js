document.getElementById("login-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    
    const data = {
        email: formData.get('login-email'),
        password: formData.get('login-password')
    };

    try {
        const response = await fetch("http://localhost:5000/api/v1/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include', // Needed to handle cookies
            body: JSON.stringify(data)
        });

        const result = await response.json();

        console.log("Login response:", result.message);

        if (result.message === 'Login successful!') {
            // Store user data if needed
            if (result.user) {
                sessionStorage.setItem('profileData', JSON.stringify(result.user));
            }
            if (result.token) {
                sessionStorage.setItem('jwt', result.token);
            }
            updateProfileUI(result.user);

            navigateTo("Landing-page");
        } else {
            document.querySelector('.login-form-error').textContent = result.message;
            document.querySelector('.login-form-error').style.display = "block";
            document.querySelector('.secret-section').style.display = "block";
        }
    } catch (error) {
        console.error("Error:", error);
        document.querySelector('.login-form-error').textContent = error;
        document.querySelector('.login-form-error').style.display = "block";
    }
});

document.getElementById("forget-password-form").addEventListener("submit", function(event) {
    event.preventDefault(); 

    const formData = new FormData(event.target);

    const data = {
        email: formData.get('forget-email')
    };

    fetch("http://localhost:5000/api/v1/auth/forgot-password/sendCode", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message == "Password recovery code sent successfully!") {
            if (data.redisKey) {
                sessionStorage.setItem('redisKey', JSON.stringify(data.redisKey));
            }            
            navigateTo("forget-code-insert-page");
        }else{
            document.querySelector('.forget-password-error').textContent = data.message;
            document.querySelector('.forget-password-error').style.display = "block";
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred: " + error);
    });
});

document.getElementById("forget-code-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        verificationCode: formData.get('forget-code'),
        redisKey: JSON.parse(sessionStorage.getItem('redisKey')) || null
    };

    fetch("http://localhost:5000/api/v1/auth/forgot-password/verifyCode", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: 'include', // Needed to handle cookies
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message == "Code successfully verified!") {
            console.log("Data:", data);
            if (data.token) {
                sessionStorage.setItem('resetToken', JSON.stringify(data.token));
            }
            navigateTo("refresh-password-page");
        }else{
            document.querySelector('.forget-code-page-error').textContent = data.message;
            document.querySelector('.forget-code-page-error').style.display = "block";
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error!");
    });
});

document.getElementById("refresh-password-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const newPassword = formData.get('new-password');
    const confirmNewPassword = formData.get('confirm-new-password');

    if (newPassword !== confirmNewPassword) {
        document.querySelector('.refresh-password-error').textContent = "New passwords do not match.";
        document.querySelector('.refresh-password-error').style.display = "block";
        return; 
    }

    const data = {
        newPassword: newPassword 
    };

    // Get the token from wherever it's stored (localStorage, sessionStorage, etc.)
    const token = sessionStorage.getItem('resetToken'); // or sessionStorage.getItem('token')

    fetch("http://localhost:5000/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // Fixed header name (capital A)
        },
        credentials: 'include',
        body: JSON.stringify(data)
    })    
    .then(response => response.json())
    .then(data => {
        if (data.message === "Password reset successfully") {
            navigateTo('login-page');
        } else {
            document.querySelector('.refresh-password-error').textContent = data.error || "An error occurred.";
            document.querySelector('.refresh-password-error').style.display = "block";
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error!");
    });
});

document.getElementById("sign-up-form").addEventListener("submit", function(event) {
    event.preventDefault();
    document.querySelector('.success-message').style.color = "green";
    document.querySelector('.success-message').textContent = 'Wait a minut....';
    document.querySelector('.success-message').style.display = "block";

    const formData = new FormData(event.target);

    const data = {
        username: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        bio: formData.get('bio'),
    };

    fetch("http://localhost:5000/api/v1/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message == "Verification code sent successfully!") {
            if (data.redisKey) {
                sessionStorage.setItem('redisKey', JSON.stringify(data.redisKey));
            }            
            navigateTo("code-insert-page");
        }
        document.querySelector('.success-message').textContent = data.error;
        document.querySelector('.success-message').style.color = "red";
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error!");
    });
});

document.getElementById("enter-code-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        verificationCode: formData.get('code'),
        redisKey: JSON.parse(sessionStorage.getItem('redisKey')) || null
    };

    fetch("http://localhost:5000/api/v1/auth/completeRegistration", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: 'include', // Needed to handle cookies
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Registration response:", data);
        if (data.message == "Registration completed successfully!") {
            sessionStorage.setItem('profileData', JSON.stringify(data.user));
            updateProfileUI(data.user);
            navigateTo("Landing-page");
        }else{
            document.querySelector('.insert-page-error').textContent = data.message;
            document.querySelector('.insert-page-error').style.display = "block";
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });
});
