import { db } from "/app.js";
import {
  collection, query, where, getDocs, setDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── EmailJS: configuración ───────────────────────────────
// Sustituye estos 3 valores por los de tu cuenta de EmailJS
const EMAILJS_PUBLIC_KEY  = "t7Jx7ppPb1M_hNTi4";
const EMAILJS_SERVICE_ID  = "service_Afa";
const EMAILJS_TEMPLATE_ID = "template_xcb8fvu";

if (window.emailjs) {
  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

async function notificarAltaSocio({ idSocio, nombre, apellido1, apellido2, mail, telefono }) {
  if (!window.emailjs) return;
  try {
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      id_socio:  idSocio,
      nombre,
      apellido1,
      apellido2,
      mail,
      telefono
    });
  } catch (err) {
    console.error("Error enviando email de notificación:", err);
    // No bloqueamos el alta del socio si falla el email
  }
}

// ── Utilidades ──────────────────────────────────────────
function sha256(str) {
  // Hash simple para la contraseña usando SubtleCrypto nativo del navegador
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(str)).then(buf =>
    Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
  );
}

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

// ── LOGIN ───────────────────────────────────────────────
document.getElementById("btnLogin").addEventListener("click", async () => {
  ocultarError("loginError");
  const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const btn      = document.getElementById("btnLogin");

  if (!email || !password) { mostrarError("loginError", "Rellena todos los campos."); return; }

  btn.disabled = true; btn.textContent = "Verificando...";

  try {
    // Buscar en colección "accesos" por email
    const q    = query(collection(db, "accesos"), where("mail", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      mostrarError("loginError", "Email no registrado. Usa la pestaña 'Registrarse' primero.");
      return;
    }

    const acceso = snap.docs[0].data();
    const hash   = await sha256(password);

    if (acceso.passwordHash !== hash) {
      mostrarError("loginError", "Contraseña incorrecta.");
      return;
    }

    // Verificar que el socio sigue activo
    const socioQ    = query(collection(db, "socios"), where("mail", "==", email));
    const socioSnap = await getDocs(socioQ);
    if (socioSnap.empty || !socioSnap.docs[0].data().activo) {
      mostrarError("loginError", "Tu cuenta de socio no está activa. Contacta con el AFA.");
      return;
    }

    const datos = socioSnap.docs[0].data();
    localStorage.setItem("socioActivo", "true");
    localStorage.setItem("socioEmail", email);
    localStorage.setItem("nombreCompleto", `${datos.nombre} ${datos.Apellido1}${datos.Apellido2 ? " " + datos.Apellido2 : ""}`);
    localStorage.setItem("idSocio", datos.IdSocio);

    window.location.href = "/privado.html";

  } catch (err) {
    console.error(err);
    mostrarError("loginError", "Error de conexión. Inténtalo de nuevo.");
  } finally {
    btn.disabled = false; btn.textContent = "Entrar";
  }
});

document.getElementById("loginPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btnLogin").click();
});

// ── REGISTRO ────────────────────────────────────────────
document.getElementById("btnRegistro").addEventListener("click", async () => {
  ocultarError("registroError");
  document.getElementById("registroOk").classList.remove("visible");

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

  try {
    // 1. Verificar que el email existe en la colección socios y está activo
    const q    = query(collection(db, "socios"), where("mail", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      mostrarError("registroError", "Este email no corresponde a ningún socio registrado. Contacta con el AFA."); return;
    }

    const datos = snap.docs[0].data();
    if (!datos.activo) {
      mostrarError("registroError", "Tu cuenta de socio no está activa. Contacta con el AFA."); return;
    }

    // 2. Verificar que no está ya registrado
    const qExiste    = query(collection(db, "accesos"), where("mail", "==", email));
    const existeSnap = await getDocs(qExiste);
    if (!existeSnap.empty) {
      mostrarError("registroError", "Este email ya tiene acceso creado. Usa la pestaña 'Acceder'."); return;
    }

    // 3. Guardar acceso con contraseña hasheada (ID = email saneado)
    const hash  = await sha256(pass1);
    const docId = email.replace(/[^a-z0-9]/g, "_");
    await setDoc(doc(db, "accesos", docId), {
      mail: email,
      passwordHash: hash
    });

    mostrarOk("registroOk", "✅ Acceso creado correctamente. Ya puedes iniciar sesión.");
    ["regEmail","regPassword","regPassword2"].forEach(id => {
      document.getElementById(id).value = "";
    });

  } catch (err) {
    console.error(err);
    mostrarError("registroError", "Error de conexión. Inténtalo de nuevo.");
  } finally {
    btn.disabled = false; btn.textContent = "Crear acceso";
  }
});

// ── RESET CONTRASEÑA ─────────────────────────────────
document.getElementById("btnReset").addEventListener("click", async () => {
  ocultarError("resetError");
  document.getElementById("resetOk").classList.remove("visible");

  const email = document.getElementById("resetEmail").value.trim().toLowerCase();
  const pass1 = document.getElementById("resetPassword").value;
  const pass2 = document.getElementById("resetPassword2").value;
  const btn   = document.getElementById("btnReset");

  if (!email || !pass1 || !pass2) {
    mostrarError("resetError", "Rellena todos los campos."); return;
  }
  if (pass1.length < 6) {
    mostrarError("resetError", "La contraseña debe tener al menos 6 caracteres."); return;
  }
  if (pass1 !== pass2) {
    mostrarError("resetError", "Las contraseñas no coinciden."); return;
  }

  btn.disabled = true; btn.textContent = "Comprobando...";

  try {
    // Verificar que el email tiene acceso registrado
    const q    = query(collection(db, "accesos"), where("mail", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      mostrarError("resetError", "No existe ninguna cuenta con ese email. Usa 'Registrarse' primero."); return;
    }

    // Verificar que el socio sigue activo
    const socioQ    = query(collection(db, "socios"), where("mail", "==", email));
    const socioSnap = await getDocs(socioQ);
    if (socioSnap.empty || !socioSnap.docs[0].data().activo) {
      mostrarError("resetError", "Tu cuenta de socio no está activa. Contacta con la AFA."); return;
    }

    // Actualizar el hash en Firestore
    const hash  = await sha256(pass1);
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, "accesos", docId), { passwordHash: hash });

    mostrarOk("resetOk", "✅ Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
    ["resetEmail","resetPassword","resetPassword2"].forEach(id => {
      document.getElementById(id).value = "";
    });

  } catch (err) {
    console.error(err);
    mostrarError("resetError", "Error de conexión. Inténtalo de nuevo.");
  } finally {
    btn.disabled = false; btn.textContent = "Cambiar contraseña";
  }
});

// ── ALTA PÚBLICA DE SOCIO ────────────────────────────────
const modalAltaSocio   = document.getElementById("modalAltaSocio");
const btnAltaSocio     = document.getElementById("btnAltaSocio");
const btnCancelarAlta  = document.getElementById("btnCancelarAlta");
const btnGuardarAlta   = document.getElementById("btnGuardarAlta");
const altaHijosWrap    = document.getElementById("altaHijosWrap");

function renderHijosAlta() {
  let html = "";
  for (let i = 1; i <= 4; i++) {
    const ordinal = ["Primer", "Segundo", "Tercer", "Cuarto"][i - 1];
    html += `
      <div class="hijo-row">
        <div class="hijo-titulo">${ordinal} hijo</div>
        <div class="form-group full">
          <label>Nombre, apellidos y año de nacimiento</label>
          <input type="text" id="altaHijo${i}" placeholder="Ej: Gabriel Buendía Barras 2010">
        </div>
      </div>`;
  }
  altaHijosWrap.innerHTML = html;
}

function limpiarFormularioAlta() {
  ["altaNombre","altaApellido1","altaApellido2","altaMail","altaTelefono","altaNif"].forEach(id => {
    document.getElementById(id).value = "";
  });
  renderHijosAlta();
}

function abrirModalAlta() {
  limpiarFormularioAlta();
  modalAltaSocio.classList.add("active");
}

function cerrarModalAlta() {
  modalAltaSocio.classList.remove("active");
}

async function siguienteIdSocio() {
  const snap = await getDocs(collection(db, "socios"));
  let max = 0;
  snap.forEach(d => {
    const id = parseInt(d.data().IdSocio) || 0;
    if (id > max) max = id;
  });
  return max + 1;
}

btnAltaSocio.addEventListener("click", abrirModalAlta);
btnCancelarAlta.addEventListener("click", cerrarModalAlta);
modalAltaSocio.addEventListener("click", e => { if (e.target === modalAltaSocio) cerrarModalAlta(); });

btnGuardarAlta.addEventListener("click", async () => {
  const nombre    = document.getElementById("altaNombre").value.trim();
  const apellido1 = document.getElementById("altaApellido1").value.trim();
  const apellido2 = document.getElementById("altaApellido2").value.trim();
  const mail      = document.getElementById("altaMail").value.trim().toLowerCase();
  const telefono  = document.getElementById("altaTelefono").value.trim();
  const nif       = document.getElementById("altaNif").value.trim().toUpperCase();
  const hijo1     = document.getElementById("altaHijo1").value.trim();

  if (!nombre || !apellido1 || !mail || !hijo1) {
    alert("Nombre, primer apellido, email e Hijo1 son obligatorios.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    alert("El email no es válido.");
    return;
  }

  btnGuardarAlta.disabled = true;
  btnGuardarAlta.textContent = "Enviando...";

  try {
    const idSocio = String(await siguienteIdSocio());

    // Comprobar que no exista ya ese ID de documento
    const existente = await getDoc(doc(db, "socios", idSocio));
    if (existente.exists()) {
      alert("Ha ocurrido un error generando tu número de socio. Inténtalo de nuevo.");
      return;
    }

    const hijosData = {};
    for (let i = 1; i <= 4; i++) {
      hijosData[`Hijo${i}`] = document.getElementById(`altaHijo${i}`).value.trim();
    }

    const nuevoSocio = {
      IdSocio: idSocio,
      nombre,
      Apellido1: apellido1,
      Apellido2: apellido2,
      mail,
      telefono,
      nif,
      activo: true,
      cuotaPagada: false,
      rol: "socio",
      ...hijosData,
    };

    await setDoc(doc(db, "socios", idSocio), nuevoSocio);

    notificarAltaSocio({
      idSocio,
      nombre,
      apellido1,
      apellido2,
      mail,
      telefono
    });

    cerrarModalAlta();
    alert("✅ ¡Inscripción enviada correctamente! En breve confirmaremos tu alta como socio.");

  } catch (err) {
    console.error(err);
    alert("❌ Error al enviar la inscripción. Inténtalo de nuevo.");
  } finally {
    btnGuardarAlta.disabled = false;
    btnGuardarAlta.textContent = "📋 Enviar inscripción";
  }
});
