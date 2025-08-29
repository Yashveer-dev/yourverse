// js/auth.js

import { auth } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const formMessage = document.getElementById('form-message');

// --- Helper function to display messages on the form ---
const showMessage = (message, isError = false) => {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = isError ? 'form-message form-message-error' : 'form-message form-message-success';
    formMessage.style.display = 'block';
};

// --- Auth State Change Listener for Routing ---
// This function ensures that:
// 1. Logged-in users are redirected from login/register pages to the home page.
// 2. Logged-out users are redirected from the home page to the login page.
onAuthStateChanged(auth, (user) => {
    const isHomePage = window.location.pathname.includes('home.html');
    const isAuthPage = window.location.pathname.includes('index.html') || window.location.pathname.includes('register.html') || window.location.pathname === '/';

    if (user) {
        // If user is logged in, but on an auth page, redirect them to home.
        if (isAuthPage) {
            window.location.replace('home.html');
        }
    } else {
        // If user is not logged in, but on a protected page, redirect them to login.
        if (isHomePage) {
            window.location.replace('index.html');
        }
    }
});


// --- Registration with Email, Password, Name, and Verification ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Set the user's display name
                return updateProfile(userCredential.user, { displayName: name })
                    .then(() => {
                        // Send the verification email
                        return sendEmailVerification(userCredential.user);
                    });
            })
            .then(() => {
                showMessage('Registration successful! Please check your inbox to verify your email.', false);
                registerForm.reset();
            })
            .catch((error) => {
                showMessage(error.message, true);
            });
    });
}


// --- Login with Email and Password ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                if (userCredential.user.emailVerified) {
                    window.location.href = 'home.html';
                } else {
                    showMessage('Please verify your email before logging in.', true);
                    auth.signOut();
                }
            })
            .catch(error => {
                showMessage(error.message, true);
            });
    });
}

// --- Google & GitHub Sign-In ---
const handleOAuth = (provider) => {
    signInWithPopup(auth, provider)
        .then(userCredential => {
            window.location.href = 'home.html';
        })
        .catch(error => {
            if (error.code === 'auth/account-exists-with-different-credential') {
                 showMessage('An account already exists with this email. Try signing in with the original method.', true);
            } else {
                showMessage(error.message, true);
            }
        });
};

const googleLoginBtn = document.getElementById('google-login') || document.getElementById('google-register');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => handleOAuth(new GoogleAuthProvider()));
}

const githubLoginBtn = document.getElementById('github-login') || document.getElementById('github-register');
if (githubLoginBtn) {
    githubLoginBtn.addEventListener('click', () => handleOAuth(new GithubAuthProvider()));
}


// --- Forgot Password ---
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        sendPasswordResetEmail(auth, email)
            .then(() => {
                showMessage('Password reset link sent! Check your email.', false);
            })
            .catch(error => {
                showMessage(error.message, true);
            });
    });
}
// --- Logout ---
const logoutBtn = document.getElementById('logout-btn');