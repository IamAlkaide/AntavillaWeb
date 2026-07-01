import { db, auth } from "/app.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── GUARD DE SESIÓN ─────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/socios.html";
    return;
  }

  // Leer datos del socio para display y rol
  const q    = query(collection(db, "socios"), where("mail", "==", user.email));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const datos = snap.docs[0].data();
    const nombreCompleto = localStorage.getItem("nombreCompleto") ||
      `${datos.nombre} ${datos.Apellido1}${datos.Apellido2 ? " " + datos.Apellido2 : ""}`;

    document.getElementById("saludo").textContent = `¡Bienvenido/a, ${nombreCompleto}! 👋`;

    // Mostrar tarjeta de junta solo si es admin
    if (datos.rol === "admin") {
      const cardJunta = document.getElementById("cardJunta");
      if (cardJunta) cardJunta.style.display = "";
    }
  }
});

// ── CERRAR SESIÓN ───────────────────────────────────────
document.getElementById("btnSalir").addEventListener("click", async () => {
  localStorage.removeItem("nombreCompleto");
  localStorage.removeItem("idSocio");
  await signOut(auth);
  window.location.href = "/socios.html";
});
