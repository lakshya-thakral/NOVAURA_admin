import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB_F3KnPwFbXHUYquuBEaEU8XV0roeJkcU",
  authDomain: "chitkara-sq-3.firebaseapp.com",
  projectId: "chitkara-sq-3",
  storageBucket: "chitkara-sq-3.firebasestorage.app",
  messagingSenderId: "956029877900",
  appId: "1:956029877900:web:d68cbd81fa7e4d066d45a9",
  measurementId: "G-F9GTTSRGJV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
