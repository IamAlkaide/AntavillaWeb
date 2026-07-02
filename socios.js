import { db, auth } from "/app.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, query, where, getDocs,
  updateDoc, doc, setDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── HELPERS UI ──────────────────────────────────────────
function mostrarError(id, texto) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.classList.add("visible");
}
function ocultarError(id) {
  document.getElementById(id).classList.remove("visible");
}
function mostrarOk(id, texto) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.classList.add("visible");
}
function ocultarOk(id) {
  document.getElementById(id).classList.remove("visible");
}

// ════════════════════════════════════════════════════════
// 1. LOGIN
// ════════════════════════════════════════════════════════
document.getElementById("btnLogin").addEventListener("click", async () => {
  ocultarError("loginError");
  const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const btn      = document.getElementById("btnLogin");

  if (!email || !password) {
    mostrarError("loginError", "Rellena todos los campos."); return;
  }

  btn.disabled = true; btn.textContent = "Verificando...";

  try {
    await signInWithEmailAndPassword(auth, email, password);

    const q    = query(collection(db, "socios"), where("mail", "==", email));
    const snap = await getDocs(q);

    if (snap.empty || snap.docs[0].data().activo !== true) {
      await signOut(auth);
      mostrarError("loginError", "Tu cuenta de socio no está activa. Contacta con la AFA.");
      return;
    }

    const datos = snap.docs[0].data();
    localStorage.setItem("nombreCompleto",
      `${datos.nombre} ${datos.Apellido1}${datos.Apellido2 ? " " + datos.Apellido2 : ""}`);
    localStorage.setItem("idSocio", datos.IdSocio);

    window.location.href = "/privado.html";

  } catch (err) {
    const codigosCredencial = [
      "auth/user-not-found", "auth/wrong-password",
      "auth/invalid-credential", "auth/invalid-email"
    ];
    mostrarError("loginError",
      codigosCredencial.includes(err.code)
        ? "Email o contraseña incorrectos."
        : "Error de conexión. Inténtalo de nuevo."
    );
  } finally {
    btn.disabled = false; btn.textContent = "Entrar";
  }
});

document.getElementById("loginPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btnLogin").click();
});

// ════════════════════════════════════════════════════════
// 2. REGISTRARSE (crear acceso zona privada — solo socios activos)
// ════════════════════════════════════════════════════════
document.getElementById("btnRegistro").addEventListener("click", async () => {
  ocultarError("registroError");
  ocultarOk("registroOk");

  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const pass1 = document.getElementById("regPassword").value;
  const pass2 = document.getElementById("regPassword2").value;
  const btn   = document.getElementById("btnRegistro");

  if (!email || !pass1 || !pass2) {
    mostrarError("registroError", "Rellena todos los campos."); return;
  }
  if (pass1.length < 6) {
    mostrarError("registroError", "La contraseña debe tener al menos 6 caracteres."); return;
  }
  if (pass1 !== pass2) {
    mostrarError("registroError", "Las contraseñas no coinciden."); return;
  }

  btn.disabled = true; btn.textContent = "Comprobando...";

  let credencial = null;
  try {
    // 1. Crear usuario en Auth primero (sin leer Firestore — no hay auth todavía)
    credencial = await createUserWithEmailAndPassword(auth, email, pass1);

    // 2. Ahora SÍ estamos autenticados → leer socios
    const q    = query(collection(db, "socios"), where("mail", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Email no existe en socios → borrar el usuario de Auth recién creado y abortar
      await credencial.user.delete();
      mostrarError("registroError",
        "Este email no corresponde a ningún socio registrado. Contacta con la AFA."); return;
    }
    if (!snap.docs[0].data().activo) {
      // Socio existe pero no activo → borrar usuario de Auth y abortar
      await credencial.user.delete();
      mostrarError("registroError",
        "Tu cuenta de socio no está activa aún. La junta debe activarla primero."); return;
    }

    // 3. Guardar uid en el documento del socio — no crítico
    try {
      await updateDoc(snap.docs[0].ref, { uid: credencial.user.uid });
    } catch (e) {
      console.warn("uid no guardado en socios (no crítico):", e.message);
    }

    mostrarOk("registroOk", "\u2705 Acceso creado correctamente. Ya puedes iniciar sesión.");
    ["regEmail", "regPassword", "regPassword2"].forEach(id => {
      document.getElementById(id).value = "";
    });

  } catch (err) {
    mostrarError("registroError",
      err.code === "auth/email-already-in-use"
        ? "Este email ya tiene acceso creado. Usa 'Acceder' o restablece tu contraseña si la olvidaste."
        : "Error de conexión. Inténtalo de nuevo."
    );
  } finally {
    try { await signOut(auth); } catch (_) {}
    btn.disabled = false; btn.textContent = "Crear acceso";
  }
});

// ════════════════════════════════════════════════════════
// 3. RESTABLECER CONTRASEÑA
// Firebase Auth envía el email automáticamente desde sus servidores.
// No requiere EmailJS ni configuración adicional.
// ════════════════════════════════════════════════════════
document.getElementById("btnReset").addEventListener("click", async () => {
  ocultarError("resetError");
  ocultarOk("resetOk");

  const email = document.getElementById("resetEmail").value.trim().toLowerCase();
  const btn   = document.getElementById("btnReset");

  if (!email) {
    mostrarError("resetError", "Introduce tu email."); return;
  }

  btn.disabled = true; btn.textContent = "Enviando...";

  try {
    await sendPasswordResetEmail(auth, email);
    // Mismo mensaje tanto si existe como si no (seguridad: no revelar qué emails están registrados)
    mostrarOk("resetOk",
      "✅ Si el email está registrado, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.");
    document.getElementById("resetEmail").value = "";

  } catch (err) {
    // Mostramos el mismo mensaje de éxito aunque falle, por seguridad
    mostrarOk("resetOk",
      "✅ Si el email está registrado, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.");
  } finally {
    btn.disabled = false; btn.textContent = "Enviar enlace";
  }
});

// ════════════════════════════════════════════════════════
// 4. ALTA NUEVO SOCIO (modal → insert en socios con activo: false)
// IdSocio se asigna automáticamente usando un contador atómico
// en config/contadores.ultimoIdSocio
// ════════════════════════════════════════════════════════

// Obtener siguiente IdSocio de forma atómica
async function siguienteIdSocio() {
  const contadorRef = doc(db, "config", "contadores");
  let nuevoId;
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(contadorRef);
    const actual = snap.exists() ? (snap.data().ultimoIdSocio || 0) : 0;
    nuevoId = actual + 1;
    transaction.set(contadorRef, { ultimoIdSocio: nuevoId }, { merge: true });
  });
  return String(nuevoId);
}

// Modal
const modalAlta     = document.getElementById("modalAlta");
const btnAbrirAlta  = document.getElementById("btnAbrirAlta");
const btnCerrarAlta = document.getElementById("btnCerrarAlta");

btnAbrirAlta.addEventListener("click", () => {
  ocultarError("altaError");
  ocultarOk("altaOk");
  modalAlta.classList.add("active");
});
btnCerrarAlta.addEventListener("click", cerrarModalAlta);
modalAlta.addEventListener("click", e => {
  if (e.target === modalAlta) cerrarModalAlta();
});

function cerrarModalAlta() {
  modalAlta.classList.remove("active");
  ["altaNombre","altaApellido1","altaApellido2","altaNif",
   "altaEmail","altaTelefono","altaHijo1","altaHijo2","altaHijo3","altaHijo4"]
    .forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("altaRgpd").checked = false;
  ocultarError("altaError");
  ocultarOk("altaOk");
}

// Enviar alta
document.getElementById("btnEnviarAlta").addEventListener("click", async () => {
  ocultarError("altaError");
  ocultarOk("altaOk");

  const nombre    = document.getElementById("altaNombre").value.trim();
  const apellido1 = document.getElementById("altaApellido1").value.trim();
  const apellido2 = document.getElementById("altaApellido2").value.trim();
  const nif       = document.getElementById("altaNif").value.trim().toUpperCase();
  const email     = document.getElementById("altaEmail").value.trim().toLowerCase();
  const telefono  = document.getElementById("altaTelefono").value.trim();
  const hijo1     = document.getElementById("altaHijo1").value.trim();
  const hijo2     = document.getElementById("altaHijo2").value.trim();
  const hijo3     = document.getElementById("altaHijo3").value.trim();
  const hijo4     = document.getElementById("altaHijo4").value.trim();
  const rgpd      = document.getElementById("altaRgpd").checked;
  const btn       = document.getElementById("btnEnviarAlta");

  if (!nombre || !apellido1 || !nif || !email || !telefono || !hijo1) {
    mostrarError("altaError", "Rellena todos los campos obligatorios (*)."); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrarError("altaError", "El email no es válido."); return;
  }
  if (!rgpd) {
    mostrarError("altaError", "Debes aceptar la Política de Privacidad para continuar."); return;
  }

  btn.disabled = true; btn.textContent = "Enviando...";

  try {
    const idSocio = await siguienteIdSocio();

    await setDoc(doc(db, "socios", idSocio), {
      IdSocio:     idSocio,
      nombre,
      Apellido1:   apellido1,
      Apellido2:   apellido2,
      nif,
      mail:        email,
      telefono,
      Hijo1:       hijo1,
      Hijo2:       hijo2,
      Hijo3:       hijo3,
      Hijo4:       hijo4,
      activo:      false,
      cuotaPagada: false,
      rol:         "socio",
      rgpd:        true,
      fecha_alta:  new Date().toISOString()
    });

    mostrarOk("altaOk",
      "✅ Solicitud enviada. La junta activará tu cuenta y te avisará por email.");
    setTimeout(() => cerrarModalAlta(), 3000);

  } catch (err) {
    console.error(err);
    mostrarError("altaError", "Error de conexión. Inténtalo de nuevo.");
  } finally {
    btn.disabled = false; btn.textContent = "Enviar solicitud";
  }
});
