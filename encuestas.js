import { db } from "/app.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Comprobación de sesión — solo socios logueados
if (!localStorage.getItem("socioActivo") || localStorage.getItem("socioActivo") !== "true") {
  window.location.href = "/socios.html";
}

const contenedor = document.getElementById("listaEncuestas");

async function cargarEncuestas() {
  const snap = await getDocs(collection(db, "encuestas"));
  const encuestas = [];

  snap.forEach(doc => encuestas.push(doc.data()));

  // Ordenar: activas primero, luego próximas, luego cerradas; dentro de cada grupo por fecha desc
  const orden = { activa: 0, proxima: 1, cerrada: 2 };
  encuestas.sort((a, b) => {
    const oa = orden[a.estado] ?? 99;
    const ob = orden[b.estado] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(b.fechaInicio) - new Date(a.fechaInicio);
  });

  if (encuestas.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <p>🗳️ No hay encuestas disponibles en este momento.<br>¡Vuelve pronto!</p>
      </div>
    `;
    return;
  }

  encuestas.forEach(e => {
    const estadoLabel = {
      activa:  { texto: "✅ Activa",   clase: "estado-activa"  },
      proxima: { texto: "🕐 Próximamente", clase: "estado-proxima" },
      cerrada: { texto: "🔒 Cerrada",  clase: "estado-cerrada" },
    }[e.estado] ?? { texto: e.estado, clase: "estado-cerrada" };

    const fechaTexto = e.fechaFin
      ? `Disponible del ${formatFecha(e.fechaInicio)} al ${formatFecha(e.fechaFin)}`
      : `Disponible desde el ${formatFecha(e.fechaInicio)}`;

    const boton = e.estado === "activa"
      ? `<a class="btn-encuesta" href="${e.url}" target="_blank">Ir a la encuesta →</a>`
      : `<a class="btn-encuesta disabled" href="#">${e.estado === "proxima" ? "Disponible pronto" : "Encuesta cerrada"}</a>`;

    contenedor.innerHTML += `
      <div class="encuesta-card">
        <h3>${e.titulo}</h3>
        <p>${e.descripcion}</p>
        <div class="encuesta-meta">
          <span class="encuesta-fecha">📅 ${fechaTexto}</span>
          <span class="encuesta-estado ${estadoLabel.clase}">${estadoLabel.texto}</span>
        </div>
        ${boton}
      </div>
    `;
  });
}

function formatFecha(fechaStr) {
  if (!fechaStr) return "";
  const [y, m, d] = fechaStr.split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
}

cargarEncuestas();
