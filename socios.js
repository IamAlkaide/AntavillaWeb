import { db } from "/app.js";
import {
  collection, query, where, getDocs, setDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
