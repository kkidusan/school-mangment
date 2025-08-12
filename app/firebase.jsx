// app/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs,groupBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBG4uR-5VimesBoUDCSIzyzwzxrMqYYluY",
  authDomain: "school-230b1.firebaseapp.com",
  projectId: "school-230b1",
  storageBucket: "school-230b1.firebasestorage.app",
  messagingSenderId: "357480957762",
  appId: "1:357480957762:web:a340cb052c8d1d5147aadb",
  measurementId: "G-YT642FGYC2",
};

const app = initializeApp(firebaseConfig);

// Initialize Analytics only in the browser
let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, analytics, signInWithEmailAndPassword, collection, query, where, groupBy,getDocs };