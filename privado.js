import { db } from "/app.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const socioActivo    = localStorage.getItem("socioActivo");
const nombreCompleto = localStorage.getItem("nombreCompleto");
const socioEmail     = localStorage.getItem("socioEmail");

if (!socioActivo || socioActivo !== "true") {
  window.location.href = "/socios.html";
}

document.getElementById("saludo").textContent =
  `¡Bienvenido/a, ${nombreCompleto}! 👋`;

document.getElementById("btnSalir").addEventListener("click", () => {
  localStorage.removeItem("socioEmail");
  localStorage.removeItem("socioActivo");
  localStorage.removeItem("nombreCompleto");
  localStorage.removeItem("idSocio");
  localStorage.removeItem("esAdmin");
  window.location.href = "/socios.html";
});

// Comprobar si el socio es admin y mostrar card Junta Directiva
async function comprobarAdmin() {
  if (!socioEmail) return;
  try {
    const q    = query(collection(db, "socios"), where("mail", "==", socioEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const datos = snap.docs[0].data();
      if (datos.rol === "admin") {
        localStorage.setItem("esAdmin", "true");
        document.getElementById("cardJunta").style.display = "flex";
      }
    }
  } catch (err) {
    console.error("Error comprobando rol admin:", err);
  }
}

comprobarAdmin();
