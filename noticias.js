import { db } from "/app.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const contenedor = document.getElementById("listaNoticias");

async function cargarNoticias() {
  const snap = await getDocs(collection(db, "noticias"));
  snap.forEach(doc => {
    const n = doc.data();
    contenedor.innerHTML += `
      <div class="card">
        <h2>${n.titulo}</h2>
        <p>${n.texto}</p>
        <small>${n.fecha}</small>
      </div>
    `;
  });
}

cargarNoticias();
