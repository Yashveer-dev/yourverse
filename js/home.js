// js/home.js

// Import auth and db from Firebase, storage is no longer needed
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

// --- REFACTORED: Cloudinary Upload Function ---
// This function can now handle any file type by specifying the resource type and preset.
const uploadToCloudinary = async (file, resourceType, uploadPreset) => {
    const CLOUD_NAME = "dngunn5k8"; // Your actual Cloud Name

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`Upload failed for ${file.name || 'audio blob'}`);
        }
        const data = await response.json();
        return data.secure_url; // Return the secure URL
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

// --- MODIFIED: Save Profile Logic to use Cloudinary for BOTH photo and audio ---
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

        // Upload photo to Cloudinary if a new one was selected
        const photoFile = photoUploadInput.files[0];
        if (photoFile) {
            // We specify the 'image' resource type and the image preset
            const photoURL = await uploadToCloudinary(photoFile, 'image', 'yourverse_preset');
            if (photoURL) {
                profileData.photoURL = photoURL;
            } else {
                throw new Error("Photo upload failed. Please try again.");
            }
        }

        // Upload voice if a new one was recorded
        if (audioBlob) {
            // We specify the 'video' resource type and the audio preset
            const voiceURL = await uploadToCloudinary(audioBlob, 'video', 'yourverse_audio_preset');
            if (voiceURL) {
                profileData.voiceURL = voiceURL;
            } else {
                throw new Error("Voice recording upload failed. Please try again.");
            }
        }

        // Save all data (including both Cloudinary URLs) to Firestore
        await setDoc(doc(db, "users", uid), profileData, { merge: true });
        
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

        // Note: Securely deleting Cloudinary assets requires a backend function.
        // The user's files will remain on Cloudinary, but the links to them in Firestore will be deleted.
        
        // 1. Delete User Document from Firestore
        const userDocRef = doc(db, "users", uid);
        await deleteDoc(userDocRef);
        console.log("Firestore document deleted successfully.");

        // 2. Delete the User from Firebase Authentication
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
