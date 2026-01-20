import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración de la Base de Datos de INVENTARIO (envios-aaf94)
const inventoryFirebaseConfig = {
    apiKey: "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
    authDomain: "envios-aaf94.firebaseapp.com",
    projectId: "envios-aaf94",
    storageBucket: "envios-aaf94.firebasestorage.app",
    messagingSenderId: "301889994673",
    appId: "1:301889994673:web:4bf140b88c095b54890790",
    measurementId: "G-QCM8ZVYE36"
};

// Inicializamos esta app secundaria con un nombre específico para no chocar con la principal
const inventoryApp = initializeApp(inventoryFirebaseConfig, "inventoryApp");

// Exportamos la referencia a la base de datos de inventario
import { getAuth } from "firebase/auth";
export const inventoryDb = getFirestore(inventoryApp);
export const inventoryAuth = getAuth(inventoryApp);
