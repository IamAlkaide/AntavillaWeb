import { db } from "/app.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Comprobación de sesión
if (!localStorage.getItem("socioActivo") || localStorage.getItem("socioActivo") !== "true") {
  window.location.href = "/socios.html";
}

const contenedor = document.getElementById("listaNewsletter");

async function cargarNewsletter() {
  const snap = await getDocs(collection(db, "newsletter"));
  const docs = [];
  snap.forEach(d => docs.push(d.data()));

  // Ordenar por fecha descendente (más reciente primero)
  docs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (docs.length === 0) {
    contenedor.innerHTML = `<div class="empty-state">📭 Aún no hay newsletters publicadas.<br>¡Vuelve pronto!</div>`;
    return;
  }

  contenedor.innerHTML = docs.map(n => {
    // Extraer el ID de Drive del enlace (acepta cualquier formato de URL de Drive)
    const idMatch = n.url.match(/[-\w]{25,}/);
    const driveId = idMatch ? idMatch[0] : null;
    const urlVer      = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : n.url;
    const urlDescargar = driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : n.url;

    return `
    <div class="newsletter-card">
      <div class="icono">📄</div>
      <h3>${n.titulo}</h3>
      <div class="meta">📅 ${formatFecha(n.fecha)}${n.curso ? ` · Curso ${n.curso}` : ""}</div>
      ${n.descripcion ? `<p>${n.descripcion}</p>` : ""}
      <div class="btn-group">
        <a class="btn-ver"       href="${urlVer}"       target="_blank">👁 Ver</a>
        <a class="btn-descargar" href="${urlDescargar}" target="_blank">⬇ Descargar</a>
      </div>
    </div>
  `}).join("");
}

function formatFecha(fechaStr) {
  if (!fechaStr) return "";
  const [y, m, d] = fechaStr.split("-");
  const meses = ["enero","febrero","marzo","abril","mayo","junio",
                  "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${parseInt(d)} de ${meses[parseInt(m)-1]} de ${y}`;
}

cargarNewsletter();
