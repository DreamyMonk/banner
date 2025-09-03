// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
// The server and client will initialize this separately.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Set up a Firestore listener
export const db = getFirestore(app);
