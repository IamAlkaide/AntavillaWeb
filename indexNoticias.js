import { db } from "/app.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const contenedor = document.getElementById("listaNoticias");

async function cargarNoticias() {
  const snap = await getDocs(collection(db, "noticias"));
  const noticias = [];

  snap.forEach(doc => noticias.push(doc.data()));

  noticias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  noticias.forEach(n => {
    contenedor.innerHTML += `
      <div class="card">
        <h3>${n.titulo}</h3>
        <p>${n.texto}</p>
        <small>${n.fecha}</small>
      </div>
    `;
  });
}

cargarNoticias();
