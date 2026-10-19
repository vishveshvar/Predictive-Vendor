import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDPSQSK5h3Rjy-ogaGx6XDR04f4i3-jESw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'predictive-vendor-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'predictive-vendor-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'predictive-vendor-demo.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '52365271306',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:52365271306:web:16ed4f0cc0d3324a0bdaf3'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;
