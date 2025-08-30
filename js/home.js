// js/home.js

// This script handles all functionality on the home page.
// We still need 'storage' for the voice intro, but not for photos.
import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
// Keep storage functions for the voice recording
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
        loadUserProfile(user.uid);
    }
});

// --- Load User Profile Data ---
const loadUserProfile = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

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

// --- NEW: Cloudinary Upload Function ---
const uploadToCloudinary = async (file) => {
    // ❗ Replace with your actual Cloudinary credentials
    const CLOUD_NAME = "dngunn5k8"; 
    const UPLOAD_PRESET = "yourverse_preset"; // The preset you created in Cloudinary settings

    const url = `https://api.cloudinary.com/v1_1/dngunn5k8/image/upload`;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            throw new Error("Upload to Cloudinary failed");
        }
        const data = await response.json();
        return data.secure_url; // Returns the HTTPS URL of the uploaded image
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return null;
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

// --- Voice Recording Logic (Unchanged) ---
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

// --- MODIFIED: Save Profile Logic to use Cloudinary ---
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

        // **MODIFIED PART:** Upload photo to Cloudinary if a new one was selected
        const photoFile = photoUploadInput.files[0];
        if (photoFile) {
            const photoURL = await uploadToCloudinary(photoFile);
            if (photoURL) {
                profileData.photoURL = photoURL;
            } else {
                // Handle potential upload failure
                throw new Error("Photo upload failed. Please try again.");
            }
        }

        // Upload voice if a new one was recorded (still uses Firebase Storage)
        if (audioBlob) {
            const voiceRef = ref(storage, `voice_intros/${uid}/intro.webm`);
            const voiceSnapshot = await uploadBytes(voiceRef, audioBlob);
            profileData.voiceURL = await getDownloadURL(voiceSnapshot.ref);
        }

        // Save all data (including the Cloudinary URL) to Firestore
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

// --- MODIFIED: Logout and Delete Account Logic ---
const logoutDeleteBtn = document.getElementById('logoutDeleteBtn');

logoutDeleteBtn.addEventListener('click', async () => {
    if (!currentUser) {
        return alert("No user is currently logged in.");
    }

    const isConfirmed = confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.");
    if (!isConfirmed) {
        return;
    }

    logoutDeleteBtn.disabled = true;
    logoutDeleteBtn.textContent = 'Deleting Account...';

    try {
        const uid = currentUser.uid;

        // Note: Deleting images from Cloudinary requires a secure backend function.
        // We will skip that here and only delete the assets from Firebase.
        
        // 1. Delete Voice Intro from Firebase Storage
        const voiceRef = ref(storage, `voice_intros/${uid}/intro.webm`);
        try {
            await deleteObject(voiceRef);
            console.log("Voice intro deleted successfully.");
        } catch (error) {
            if (error.code !== 'storage/object-not-found') {
                throw error;
            }
            console.log("No voice intro to delete.");
        }
        
        // 2. Delete User Document from Firestore
        const userDocRef = doc(db, "users", uid);
        await deleteDoc(userDocRef);
        console.log("Firestore document deleted successfully.");

        // 3. Delete the User from Firebase Authentication
        await deleteUser(currentUser);
        
        alert("Your account has been successfully deleted.");
        window.location.replace('index.html');

    } catch (error) {
        console.error("Error deleting account:", error);
        if (error.code === 'auth/requires-recent-login') {
            alert("This is a sensitive operation. Please log in again to delete your account.");
        } else {
            alert(`Failed to delete account: ${error.message}`);
        }
    } finally {
        logoutDeleteBtn.disabled = false;
        logoutDeleteBtn.textContent = 'Logout & Delete Account';
    }
});
