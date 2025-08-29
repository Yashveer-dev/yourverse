// js/firebase-config.js

// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtJ8SvQjbeOaXJXggI8AcUARO__cVqzNQ",
  authDomain: "yourverse-77089.firebaseapp.com",
  projectId: "yourverse-77089",
  storageBucket: "yourverse-77089.firebasestorage.app",
  messagingSenderId: "821758205098",
  appId: "1:821758205098:web:4eb41dc9fec716514a44d3",
  measurementId: "G-FVNNGEYHZS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services to be used in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
