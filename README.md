# Georgina - Personal Shopper Platform

Plataforma web para gestión de citas de personal shopper con sistema de pagos y notificaciones por correo.

## 🚀 Características

- ✅ Sistema de autenticación con Firebase
- 📅 Agendamiento de citas con selección múltiple de horarios
- 💰 Gestión de pagos con subida de comprobantes
- 📧 Notificaciones automáticas por email (EmailJS)
- 👑 Panel de administración para aprobar citas
- 📱 Diseño Mobile First totalmente responsive
- 🔒 Reglas de seguridad para Firestore y Storage

## 📧 Sistema de Notificaciones

El sistema envía automáticamente correos electrónicos en dos momentos:

1. **Al agendar una cita**: El cliente recibe confirmación con detalles de la cita y datos para pago
2. **Al aprobar el pago**: El cliente recibe confirmación de que su cita está 100% confirmada

### Configuración de EmailJS

**⚠️ IMPORTANTE**: Antes de usar la aplicación en producción, debes configurar EmailJS.

Lee la guía completa en: [EMAILJS_SETUP.md](./EMAILJS_SETUP.md)

Pasos rápidos:
1. Crear cuenta en [EmailJS](https://www.emailjs.com/)
2. Configurar servicio de email (Gmail, Outlook, etc.)
3. Crear dos templates de email
4. Actualizar credenciales en `src/config/emailConfig.js`

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## 🔧 Configuración

### 1. Firebase

Actualiza las credenciales en `src/firebase.js`:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    projectId: "TU_PROJECT_ID",
    // ...
};
```

### 2. Reglas de Seguridad

Aplica las reglas de seguridad en la consola de Firebase:

- **Firestore**: Copia el contenido de `firestore.rules`
- **Storage**: Copia el contenido de `storage.rules`

### 3. EmailJS

Sigue la guía en `EMAILJS_SETUP.md` para configurar las notificaciones por correo.

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── LoginModal.jsx
│   └── ProtectedAdminRoute.jsx
├── config/             # Configuraciones
│   └── emailConfig.js  # Credenciales de EmailJS
├── contexts/           # Contextos de React
│   └── AuthContext.jsx
├── pages/              # Páginas principales
│   ├── Home.jsx
│   ├── UserDashboard.jsx
│   └── AdminPanel.jsx
├── firebase.js         # Configuración de Firebase
└── main.jsx           # Punto de entrada
```

## 🔐 Usuarios

### Usuario Regular
- Puede agendar citas
- Puede subir comprobantes de pago
- Ve el estado de sus citas en el dashboard

### Administrador
- Email: `luisuf@gmail.com` (configurado en reglas)
- Puede crear fechas disponibles
- Puede aprobar pagos
- Ve todas las citas agendadas

## 💳 Flujo de Pago

1. Cliente agenda cita y recibe email de confirmación
2. Cliente sube comprobante de depósito
3. Admin revisa comprobante
4. Admin aprueba pago
5. Cliente recibe email de confirmación de pago

## 🎨 Tecnologías

- **React** + Vite
- **Firebase** (Auth, Firestore, Storage)
- **Tailwind CSS** para estilos
- **EmailJS** para notificaciones
- **Lucide React** para iconos

## 📱 Mobile First

La aplicación está optimizada para dispositivos móviles con diseño responsive que se adapta a tablets y desktop.

## 🚨 Notas Importantes

- El límite gratuito de EmailJS es 200 emails/mes
- Los correos se envían de forma asíncrona
- Si falla el envío del email, la cita se guarda de todas formas
- Se recomienda configurar autenticación de dos factores en Firebase

## 📝 Licencia

Proyecto privado - Todos los derechos reservados
