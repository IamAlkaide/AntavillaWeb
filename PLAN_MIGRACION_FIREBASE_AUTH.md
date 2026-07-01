# Plan de Migración: Login Custom (SHA-256) → Firebase Authentication

**Proyecto:** AFA Antavilla
**Objetivo:** Cerrar la brecha de seguridad en Firestore (reglas abiertas `if true`) migrando el sistema de autenticación a Firebase Auth, sin coste (plan Spark gratuito, sin Cloud Functions).
**Presupuesto:** 0€

---

## 0. Resumen del problema actual

- Firestore Security Rules en modo `allow read, write: if true` → toda la base de datos (DNI, teléfono, email, hashes de contraseña) es legible y escribible por cualquiera, sin login, desde la consola del navegador.
- El login actual es custom: hash SHA-256 sin salt, comparado manualmente contra la colección `accesos`, y la sesión se gestiona con `localStorage.setItem("socioActivo", "true")`.
- Firestore no puede aplicar reglas de seguridad reales porque `request.auth` siempre es `null` (no se usa Firebase Auth).
- Conclusión: hay que migrar a Firebase Auth (gratis) para poder usar `request.auth` en las reglas y cerrar el acceso real a nivel de servidor.

---

## 1. Plan de fases

| Fase | Qué se hace | Riesgo de caída del sitio |
|------|-------------|---------------------------|
| Fase 0 | Backup de datos | Ninguno |
| Fase 1 | Bloqueo de emergencia en Firestore Rules | Login/registro/admin dejan de funcionar temporalmente |
| Fase 2 | Activar Firebase Auth en consola | Ninguno |
| Fase 3 | Reescribir `socios.js` (login/registro) | — |
| Fase 4 | Reescribir guardas de sesión en páginas privadas | — |
| Fase 5 | Reescribir `junta.js` (rol admin) | — |
| Fase 6 | Reescribir `privado-libros.js` (autoría de libros) | — |
| Fase 7 | Migrar usuarios existentes (re-registro) | Afecta a socios ya registrados |
| Fase 8 | Reglas de Firestore definitivas | — |
| Fase 9 | Limpieza: eliminar colección `accesos` | — |
| Fase 10 | Verificación y pruebas | — |
| Fase 11 | Documentación legal (RAT, política de privacidad) | — |

---

## 2. FASE 0 — Backup antes de tocar nada

**Dónde:** Firebase Console → Firestore Database → Datos

1. Exportar manualmente (copiar/pegar a un Excel/CSV) el contenido completo de las colecciones:
   - `socios`
   - `accesos`
   - `libros`
   - `noticias`
   - `eventos`
   - `encuestas`
   - `newsletter`
2. Guardar ese backup fuera de Firebase (Google Drive, disco local).

*No se puede perder esta información si algo sale mal en las fases siguientes.*

---

## 3. FASE 1 — Bloqueo de emergencia (Firestore Rules)

**Dónde:** Firebase Console → Firestore Database → Reglas

Sustituir las reglas actuales por estas, como medida temporal **antes** de tener Firebase Auth funcionando:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /noticias/{doc}   { allow read: if true; allow write: if false; }
    match /eventos/{doc}    { allow read: if true; allow write: if false; }
    match /encuestas/{doc}  { allow read: if true; allow write: if false; }
    match /newsletter/{doc} { allow read: if true; allow write: if false; }
    match /libros/{doc}     { allow read: if true; allow write: if false; }

    match /socios/{doc}  { allow read, write: if false; }
    match /accesos/{doc} { allow read, write: if false; }
  }
}
```

**Efecto inmediato:**
- Se cierra el acceso a `socios` y `accesos` (los datos sensibles quedan protegidos ya).
- Login, registro, alta de libros y panel de admin (`junta.html`) **dejan de funcionar** hasta completar la migración.
- Las páginas públicas (noticias, eventos, encuestas, newsletter, listado de libros) siguen funcionando en lectura.

**Acción recomendada:** avisar a los socios de que el área privada estará caída unos días por mantenimiento de seguridad.

---

## 4. FASE 2 — Activar Firebase Authentication

**Dónde:** Firebase Console → Authentication

1. Click en "Comenzar" / "Get started".
2. En la pestaña **Sign-in method**, habilitar el proveedor **Correo electrónico/contraseña** (Email/Password).
3. No es necesario activar verificación de email obligatoria, pero se recomienda activarla más adelante (opcional, sin coste).
4. Confirmar que sigue en plan **Spark** (gratuito) — Authentication con email/password no requiere Blaze.

**Coste:** 0€. No pide tarjeta.

---

## 5. FASE 3 — Reescribir `socios.js` (login y registro)

**Ficheros afectados:** `socios.js`, `App.js` (ya exporta `auth`, no requiere cambios)

**Cambios de lógica:**

- **Registro:** en vez de guardar manualmente un hash SHA-256 en la colección `accesos`, usar:
  ```js
  import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  ```
  - Verificar primero que el email existe en `socios` y `activo == true` (se mantiene esta comprobación).
  - Llamar a `createUserWithEmailAndPassword(auth, email, password)`.
  - El `uid` que devuelve Firebase Auth debe guardarse como referencia en el documento del socio (campo `uid` dentro de `socios/{idDelSocio}`, o usar el propio `uid` como ID del documento — a decidir, ver Fase 7).

- **Login:** en vez de comparar hashes manualmente, usar:
  ```js
  import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  ```
  - Llamar a `signInWithEmailAndPassword(auth, email, password)`.
  - Si tiene éxito, leer el documento `socios` correspondiente (por `uid` o por `mail`) para obtener nombre, IdSocio, rol, etc.
  - Ya no se usa `localStorage.setItem("socioActivo", "true")` como mecanismo de control de acceso — Firebase Auth gestiona la sesión internamente (persistencia automática vía IndexedDB del navegador). `localStorage` puede seguir usándose solo para cachear datos de visualización (nombre completo, etc.), nunca como control de seguridad.

**Eliminar:** la función `sha256()` y toda referencia a la colección `accesos`.

---

## 6. FASE 4 — Reescribir las guardas de sesión

**Ficheros afectados:** `privado.js`, `privado-libros.js`, `privado-newsletter.js`, `encuestas.js` (si tiene guarda), `junta.js`

**Cambio de patrón:**

Antes:
```js
if (!socioActivo || socioActivo !== "true") {
  window.location.href = "/socios.html";
}
```

Después:
```js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "/app.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/socios.html";
    return;
  }
  // continuar inicialización de la página usando user.uid / user.email
});
```

Esto es necesario porque Firebase Auth comprueba la sesión de forma asíncrona al cargar la página (a diferencia de `localStorage`, que es síncrono e inmediato pero no fiable).

---

## 7. FASE 5 — `junta.js` (panel de administración)

- La comprobación de `rol: "admin"` se mantiene como campo en Firestore dentro del documento `socios`, pero ahora se valida tanto en cliente (UX, ocultar/mostrar panel) como en las **Firestore Rules** (seguridad real), usando `request.auth.uid` para localizar el documento del socio y comprobar su rol server-side.

---

## 8. FASE 6 — `privado-libros.js` (autoría de libros)

- Sustituir el uso de `localStorage.getItem("emailSocio")` para identificar al propietario del libro por `auth.currentUser.email` (ya está parcialmente contemplado en el código actual como fallback).
- El borrado/edición de un libro debe validarse también en las reglas de Firestore (ver Fase 8), no solo ocultando el botón en el frontend.

---

## 9. FASE 7 — Migración de usuarios existentes

**Problema:** los hashes SHA-256 de la colección `accesos` actual **no son compatibles** con Firebase Auth (no se puede "importar" una contraseña ya hasheada con un algoritmo distinto sin que el usuario la vuelva a introducir).

**Opción elegida — Re-registro asistido:**
1. Mantener la colección `accesos` antigua intacta (sin leer ni escribir desde el cliente) únicamente como registro histórico/backup.
2. Comunicar a todos los socios que deben volver a crear su acceso una vez activada la nueva versión (mismo proceso de la pestaña "Registrarse", ahora sobre Firebase Auth).
3. Pasado un plazo razonable (ej. 30 días), eliminar definitivamente la colección `accesos`.

*Alternativa más compleja (Cloud Functions con Admin SDK para importar usuarios) descartada por implicar activar el plan Blaze.*

---

## 10. FASE 8 — Reglas de Firestore definitivas

**Dónde:** Firebase Console → Firestore Database → Reglas

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Contenido público de solo lectura
    match /noticias/{doc}   { allow read: if true; allow write: if false; }
    match /eventos/{doc}    { allow read: if true; allow write: if false; }
    match /encuestas/{doc}  { allow read: if true; allow write: if false; }
    match /newsletter/{doc} { allow read: if true; allow write: if false; }

    // Socios: solo el propio socio (autenticado) puede leer/editar su ficha;
    // un admin puede leer/editar cualquier ficha
    match /socios/{socioId} {
      allow read: if request.auth != null;
      allow update: if request.auth != null && (
        request.auth.uid == socioId ||
        get(/databases/$(database)/documents/socios/$(request.auth.uid)).data.rol == "admin"
      );
      allow create: if false; // el alta de socios la gestiona la junta manualmente, no el cliente
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/socios/$(request.auth.uid)).data.rol == "admin";
    }

    // Libros: lectura pública (tablón abierto), escritura solo si estás logueado
    match /libros/{libroId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.token.email == resource.data.mail_socio;
      allow delete: if false;
    }
  }
}
```

**Nota:** esto asume que el ID de documento en `socios` coincide con el `uid` de Firebase Auth (recomendado, ver Fase 7). Si se mantiene el `IdSocio` actual como ID de documento, hay que ajustar las reglas para buscar por campo `uid` en vez de por ID de documento (usando `request.auth.uid == resource.data.uid`).

---

## 11. FASE 9 — Limpieza

1. Eliminar la colección `accesos` de Firestore (tras el plazo de migración de la Fase 7).
2. Eliminar del código cualquier referencia residual a `sha256()`, `localStorage.getItem("socioActivo")` como control de seguridad, y a la colección `accesos`.
3. Revisar `junta.js` y confirmar que no queda ninguna ruta que dependa del sistema antiguo.

---

## 12. FASE 10 — Verificación y pruebas

Checklist antes de dar por cerrada la migración:

- [ ] Un usuario no logueado, desde la consola del navegador, **no puede leer** `socios` (probar con `getDocs(collection(db,"socios"))` sin sesión → debe fallar).
- [ ] Un socio logueado puede ver/editar su propia ficha, pero no la de otro socio.
- [ ] Un admin puede ver y editar todas las fichas desde `junta.html`.
- [ ] El alta de un libro en el tablón requiere estar logueado.
- [ ] El borrado/edición de un libro solo lo puede hacer su propietario.
- [ ] Las páginas públicas (noticias, eventos, encuestas, newsletter) siguen cargando sin login.
- [ ] Probar registro y login con un usuario de prueba de principio a fin.
- [ ] Revisar consola del navegador (F12) en todas las páginas privadas: no debe haber errores de permisos inesperados.

---

## 13. FASE 11 — Documentación legal (en paralelo, sin coste)

No requiere desarrollo, pero es necesario para cumplimiento RGPD:

1. **Registro de Actividades de Tratamiento (RAT):** documento interno (Word/Excel) listando: qué datos se tratan (DNI, teléfono, email, datos de hijos), con qué finalidad, base legitimadora, plazo de conservación, medidas de seguridad aplicadas (Firebase Auth + Firestore Rules + Netlify HTTPS).
2. **Consentimiento expreso en el alta de socios:** añadir al Google Form de alta una casilla de consentimiento RGPD explícita, separada de cualquier otra autorización.
3. **Actualizar `politica-privacidad.html`:** declarar el uso de Firebase (Google) y Netlify como encargados de tratamiento, y mencionar la posible transferencia internacional de datos (Cláusulas Contractuales Tipo de Google/Netlify).
4. **Procedimiento de derechos ARCO:** dejar por escrito (puede ser un documento interno de la junta) el proceso a seguir si un socio solicita acceso, rectificación o supresión de sus datos, incluyendo cómo se ejecuta técnicamente en Firestore.
5. **DPA con Firebase y Netlify:** confirmar que se han aceptado los términos de tratamiento de datos de ambos servicios (Google los incluye en los términos de Firebase; Netlify los ofrece en su Data Processing Addendum, aceptable desde el dashboard o por solicitud).

---

## 14. Orden recomendado de ejecución

1. Fase 0 (backup) — **hoy**
2. Fase 1 (bloqueo de emergencia) — **hoy**, en cuanto el backup esté hecho
3. Fase 2 (activar Auth) — **hoy**
4. Fases 3 a 6 (reescritura de código) — en una sesión de desarrollo dedicada
5. Fase 7 (comunicación a socios + re-registro) — tras desplegar el código nuevo en Netlify
6. Fase 8 (reglas definitivas) — una vez confirmado que el re-registro funciona para varios socios de prueba
7. Fase 9 (limpieza) — pasado el plazo de migración
8. Fase 10 (verificación) — checklist final
9. Fase 11 (documentación legal) — en paralelo a cualquier fase, no bloquea el desarrollo

---

## 15. Ficheros que se tocarán en total

- `App.js` — sin cambios (ya exporta `auth`)
- `socios.js` — reescritura completa (login/registro)
- `socios.html` — sin cambios estructurales, mismo formulario
- `privado.js` — guarda de sesión
- `privado-libros.js` — guarda de sesión + autoría de libros
- `privado-newsletter.js` — guarda de sesión
- `encuestas.js` — guarda de sesión (si aplica)
- `junta.js` — guarda de sesión + lógica de rol admin (no incluido en los ficheros revisados hasta ahora, pendiente de ver su contenido)
- Firestore Rules — Fase 1 y Fase 8
- Firebase Authentication — activación en consola
- `politica-privacidad.html` — actualización de texto legal
- Google Form de alta de socios — añadir casilla de consentimiento RGPD
