# Configuración de EmailJS para Notificaciones

Este proyecto utiliza EmailJS para enviar correos electrónicos automáticos. Sigue estos pasos para configurarlo:

## 1. Crear cuenta en EmailJS

1. Ve a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Crea una cuenta gratuita
3. Verifica tu correo electrónico

## 2. Configurar el Servicio de Email

1. En tu dashboard de EmailJS, ve a **Email Services**
2. Haz clic en **Add New Service**
3. Selecciona tu proveedor de correo (Gmail, Outlook, etc.)
4. Conecta tu cuenta de correo
5. Copia el **Service ID** que aparece

## 3. Crear Templates de Email

### Template 1: Confirmación de Cita Agendada

1. Ve a **Email Templates** → **Create New Template**
2. Configura:
   - **Template Name**: `Confirmacion_Cita_Agendada`
   - **Subject**: `Cita Agendada - Georgina Personal Shopper`
   - **Content**:
   ```
   Hola {{user_name}},

   ¡Tu cita ha sido agendada exitosamente!

   DETALLES DE LA CITA:
   📅 Fecha: {{fecha}}
   🕐 Horarios: {{horarios}}
   🏬 Tienda: {{tienda}}
   💰 Total Estimado: {{total}}
   📋 Estado: {{estado}}

   Para confirmar tu cita, por favor realiza el pago y sube tu comprobante en tu dashboard.

   Datos para transferencia:
   - Banco: Banco Pichincha
   - Tipo: Cuenta de Ahorros
   - Número: 220XXXXXXX
   - Titular: Georgina App

   ¡Gracias por confiar en nosotros!

   Georgina Personal Shopper
   ```
3. Guarda el template y copia el **Template ID**

### Template 2: Confirmación de Pago Aprobado

1. Crea otro template
2. Configura:
   - **Template Name**: `Confirmacion_Pago_Aprobado`
   - **Subject**: `Pago Confirmado - Georgina Personal Shopper`
   - **Content**:
   ```
   Hola {{user_name}},

   ¡Tu pago ha sido verificado y aprobado! ✅

   DETALLES DE LA CITA CONFIRMADA:
   📅 Fecha: {{fecha}}
   🕐 Horarios: {{horarios}}
   🏬 Tienda: {{tienda}}
   💰 Total Pagado: {{total}}

   Tu cita está 100% confirmada. Nos vemos el día programado.

   ¡Gracias por tu compra!

   Georgina Personal Shopper
   ```
3. Guarda y copia el **Template ID**

## 4. Obtener tu Public Key

1. Ve a **Account** → **General**
2. Copia tu **Public Key** (también llamado User ID)

## 5. Actualizar el archivo de configuración

Abre el archivo `src/config/emailConfig.js` y reemplaza los valores:

```javascript
export const EMAILJS_CONFIG = {
    SERVICE_ID: 'service_xxxxxxx',  // Tu Service ID
    TEMPLATE_CITA_AGENDADA: 'template_xxxxxxx',  // Template ID del primer email
    TEMPLATE_PAGO_APROBADO: 'template_yyyyyyy',  // Template ID del segundo email
    PUBLIC_KEY: 'user_xxxxxxxxxxxx'  // Tu Public Key
};
```

## 6. Verificar funcionamiento

1. Reinicia el servidor de desarrollo
2. Prueba agendando una cita
3. Verifica que llegue el correo de confirmación
4. Aprueba el pago desde el admin panel
5. Verifica que llegue el correo de pago aprobado

## Variables disponibles en los templates

### Para Confirmación de Cita:
- `{{user_name}}` - Nombre del usuario
- `{{user_email}}` - Email del usuario
- `{{fecha}}` - Fecha de la cita (formato largo)
- `{{horarios}}` - Horarios seleccionados
- `{{tienda}}` - Tienda seleccionada
- `{{total}}` - Total estimado con formato
- `{{estado}}` - Estado de la cita

### Para Pago Aprobado:
- `{{user_name}}` - Nombre del usuario
- `{{user_email}}` - Email del usuario
- `{{fecha}}` - Fecha de la cita
- `{{horarios}}` - Horarios confirmados
- `{{total}}` - Total pagado
- `{{tienda}}` - Tienda

## Notas importantes

- EmailJS tiene un límite gratuito de 200 emails/mes
- Los correos se envían de forma asíncrona y no bloquean el flujo de la aplicación
- Si falla el envío del email, la cita se guarda de todas formas
- Revisa la consola del navegador para ver logs de envío de emails
