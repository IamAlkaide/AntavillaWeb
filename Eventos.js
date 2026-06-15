import { db } from "/app.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const contFuturos = document.getElementById("eventosFuturos");
const contPasados = document.getElementById("eventosPasados");

// Soporta tanto "DD-MM-YYYY" como "YYYY-MM-DD"
function parseFecha(fechaStr) {
  if (!fechaStr) return new Date(0);
  const partes = fechaStr.split("-");
  if (partes[0].length === 4) {
    // YYYY-MM-DD
    return new Date(partes[0], partes[1] - 1, partes[2]);
  } else {
    // DD-MM-YYYY
    return new Date(partes[2], partes[1] - 1, partes[0]);
  }
}

function formatFecha(fechaStr) {
  const d = parseFecha(fechaStr);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function tarjetaEvento(e, pasado) {
  const imagenHTML = e.imagen
    ? `<img src="${e.imagen}" alt="${e.titulo}">`
    : `<span class="sin-imagen">📅</span>`;

  return `
    <div class="evento-card${pasado ? " card-pasado" : ""}">
      <div class="evento-info">
        <h3>${e.titulo}</h3>
        <p>${e.descripcion}</p>
        <small>📅 ${formatFecha(e.fecha)}</small>
      </div>
      <div class="evento-imagen">
        ${imagenHTML}
      </div>
    </div>
  `;
}

async function cargarEventos() {
  const snap = await getDocs(collection(db, "eventos"));

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const futuros = [];
  const pasados = [];

  snap.forEach(doc => {
    const data = doc.data();
    const fecha = parseFecha(data.fecha);
    fecha >= hoy ? futuros.push(data) : pasados.push(data);
  });

  futuros.sort((a, b) => parseFecha(a.fecha) - parseFecha(b.fecha));
  pasados.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha));

  if (futuros.length === 0) {
    contFuturos.innerHTML = `<p style="color:#888; padding:10px;">No hay eventos próximos por ahora.</p>`;
  } else {
    futuros.forEach(e => contFuturos.innerHTML += tarjetaEvento(e, false));
  }

  if (pasados.length === 0) {
    contPasados.innerHTML = `<p style="color:#888; padding:10px;">Aún no hay eventos pasados.</p>`;
  } else {
    pasados.forEach(e => contPasados.innerHTML += tarjetaEvento(e, true));
  }
}

cargarEventos();
