// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // For Firestore
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPG-H5yw_y6tb8GB_QQUcIt5Kg0PZftrw",
  authDomain: "ahmadr-68891.firebaseapp.com",
  projectId: "ahmadr-68891",
  storageBucket: "ahmadr-68891.firebasestorage.app",
  messagingSenderId: "1064060560935",
  appId: "1:1064060560935:web:7b9f3430cbcb57383d5002",
  measurementId: "G-1QJH8JXD6P",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app);

// Export the initialized Firebase app, Firestore, and Storage instances
export { app, firestore };
