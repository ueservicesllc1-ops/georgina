import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDvm_6bOqjfOoypHl3KOfxsUtv6JlejQIs",
    authDomain: "videoeditor-7722c.firebaseapp.com",
    projectId: "videoeditor-7722c",
    storageBucket: "videoeditor-7722c.firebasestorage.app",
    messagingSenderId: "560895614627",
    appId: "1:560895614627:web:652db07651ed58d4842916",
    measurementId: "G-RQH4GMSPXJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
