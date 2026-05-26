// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVeQRNTuRyLPVWKUu0x3y56cib71aqZ7M",
  authDomain: "scaet-f8d1f.firebaseapp.com",
  projectId: "scaet-f8d1f",
  storageBucket: "scaet-f8d1f.firebasestorage.app",
  messagingSenderId: "916795230217",
  appId: "1:916795230217:web:2dd1870e8064a992f910d8"
};

// Inicializamos Firebase en nuestro Front-End
const app = initializeApp(firebaseConfig);

// Exportamos los módulos listos para usarlos en cualquier pantalla
export const auth = getAuth(app);
export const db = getFirestore(app);       // Para el inventario y texto
export const storage = getStorage(app);   // Para las fotos comprimidas y PDFs