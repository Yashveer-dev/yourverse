// js/home.js

// This script handles all functionality on the home page.
import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

// --- DOM Elements ---
const welcomeMessage = document.getElementById('welcome-message');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const photoPreview = document.getElementById('photo-preview');
const photoUploadInput = document.getElementById('photo-upload');
const ageInput = document.getElementById('age-input');
const hobbiesInput = document.getElementById('hobbies-input');
const skillsInput = document.getElementById('skills-input');
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const audioPlayback = document.getElementById('audioPlayback');

// --- State Variables ---
let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let currentUser = null;

// --- Primary Auth Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        welcomeMessage.textContent = `Welcome, ${user.displayName || user.email}!`;
        // **FIX:** Call the updated function to only load profile data, not redirect.
        loadUserProfile(user.uid);
    }
    // No 'else' needed because auth.js handles redirecting logged-out users.
});

// --- **FIX:** Renamed function and removed the redirect logic ---
// This function now ONLY loads data, allowing existing users to edit their profile.
const loadUserProfile = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        // If a profile exists, populate the form fields with the data.
        if (docSnap.exists()) {
            const data = docSnap.data();
            ageInput.value = data.age || '';
            hobbiesInput.value = data.hobbies || '';
            skillsInput.value = data.skills || '';
            if (data.photoURL) {
                photoPreview.src = data.photoURL;
            }
            if (data.voiceURL) {
                audioPlayback.src = data.voiceURL;
                audioPlayback.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
};


// --- Photo Preview Logic ---
photoUploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            photoPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// --- Voice Recording Logic ---
recordBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        audioChunks = [];
        audioBlob = null;

        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioPlayback.src = URL.createObjectURL(audioBlob);
            audioPlayback.style.display = 'block';
        };

        recordBtn.disabled = true;
        stopBtn.disabled = false;
    } catch (err) {
        console.error("Microphone access error:", err);
        alert("Could not access microphone. Please check permissions.");
    }
});

stopBtn.addEventListener('click', () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
    }
});

// --- Save Profile Logic ---
saveProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return alert("You're not logged in.");

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving...';

    try {
        const uid = currentUser.uid;
        const profileData = {
            age: ageInput.value,
            hobbies: hobbiesInput.value,
            skills: skillsInput.value,
        };

        // Upload photo if a new one was selected
        const photoFile = photoUploadInput.files[0];
        if (photoFile) {
            const photoRef = ref(storage, `profile_photos/${uid}/${photoFile.name}`);
            const photoSnapshot = await uploadBytes(photoRef, photoFile);
            profileData.photoURL = await getDownloadURL(photoSnapshot.ref);
        }

        // Upload voice if a new one was recorded
        if (audioBlob) {
            const voiceRef = ref(storage, `voice_intros/${uid}/intro.webm`);
            const voiceSnapshot = await uploadBytes(voiceRef, audioBlob);
            profileData.voiceURL = await getDownloadURL(voiceSnapshot.ref);
        }

        // Save all data to Firestore
        await setDoc(doc(db, "users", uid), profileData, { merge: true });
        
        // Redirect to the dashboard on successful save
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Error saving profile:", error);
        alert(`Error: ${error.message}`);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Save & View Dashboard';
    }
});

// --- Logout and Delete Account Logic ---
const logoutDeleteBtn = document.getElementById('logoutDeleteBtn');

logoutDeleteBtn.addEventListener('click', async () => {
    if (!currentUser) {
        return alert("No user is currently logged in.");
    }

    // Confirmation prompt to prevent accidental deletion
    const isConfirmed = confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.");
    if (!isConfirmed) {
        return;
    }

    logoutDeleteBtn.disabled = true;
    logoutDeleteBtn.textContent = 'Deleting Account...';

    try {
        const uid = currentUser.uid;

        // 1. Delete Voice Intro from Firebase Storage
        const voiceRef = ref(storage, `voice_intros/${uid}/intro.webm`);
