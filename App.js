import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCpGuMrja__iUzTY2MTGSvonzbMGZRnN-k",
  authDomain: "apa-antavilla-73394.firebaseapp.com",
  projectId: "apa-antavilla-73394",
  storageBucket: "apa-antavilla-73394.firebasestorage.app",
  messagingSenderId: "810232943650",
  appId: "1:810232943650:web:31df29854399017274267b",
  measurementId: "G-SWQZ2HYX2X"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
