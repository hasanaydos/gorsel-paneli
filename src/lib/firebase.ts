// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAed7tS2VVpZqw-HpCHFHpZAHhAKBYPmnw",
  authDomain: "kampanya-gorselleri.firebaseapp.com",
  projectId: "kampanya-gorselleri",
  storageBucket: "kampanya-gorselleri.firebasestorage.app",
  messagingSenderId: "749179657428",
  appId: "1:749179657428:web:03ae3cf671e10a77bd6f41"
};

// Firebase uygulaması zaten başlatıldıysa tekrar başlatma
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const storage = getStorage(app)
