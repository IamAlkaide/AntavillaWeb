import { db } from "/app.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const contenedor = document.getElementById("listaEventos");

async function cargarEventos() {
  const snap = await getDocs(collection(db, "eventos"));
  const eventos = [];

  snap.forEach(doc => eventos.push(doc.data()));

  // Ordenar por fecha ascendente
  eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  eventos.forEach(e => {
    contenedor.innerHTML += `
      <div class="card">
        <h3>${e.titulo}</h3>
        <p>${e.descripcion}</p>
        <small>${e.fecha}</small>
      </div>
    `;
  });
}

cargarEventos();
