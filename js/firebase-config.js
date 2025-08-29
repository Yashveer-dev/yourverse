// js/firebase-config.js

// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtRxa8dEhid1zbQni1OLqF3VWa8HnP7a0",
  authDomain: "yourverse-23eab.firebaseapp.com",
  projectId: "yourverse-23eab",
  storageBucket: "yourverse-23eab.firebasestorage.app",
  messagingSenderId: "697721327664",
  appId: "1:697721327664:web:6f2e1cc842d3883a9bddf5",
  measurementId: "G-W612WM9MZZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services to be used in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
