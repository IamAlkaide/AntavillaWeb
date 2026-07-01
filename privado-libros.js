import { db, auth } from "/app.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── ESTADO ──────────────────────────────────────────────
let emailSocioActual = null;
let todosLosLibros   = [];
let librosFiltrados  = [];

// ── DOM ─────────────────────────────────────────────────
const modalFormulario  = document.getElementById("modalFormulario");
const formAgregarLibro = document.getElementById("formAgregarLibro");
const btnAbrirFormulario = document.getElementById("btnAbrirFormulario");
const btnCerrarModal   = document.getElementById("btnCerrarModal");
const popupNotificacion = document.getElementById("popupNotificacion");
const cuerpoTabla      = document.getElementById("cuerpoTabla");
const inputBusqueda    = document.getElementById("inputBuscar");
const btnBuscar        = document.getElementById("btnBuscar");
const btnLimpiar       = document.getElementById("btnLimpiar");
const contadorResultados = document.getElementById("contadorResultados");

// ── GUARD DE SESIÓN ─────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/socios.html";
    return;
  }
  emailSocioActual = user.email;
  cargarLibros();
});

// ── POPUP ────────────────────────────────────────────────
function mostrarPopup(titulo, mensaje, tipo = "success") {
  popupNotificacion.classList.add("active", tipo);
  document.getElementById("popupTitulo").textContent = titulo;
  document.getElementById("popupMensaje").textContent = mensaje;
  setTimeout(() => {
    popupNotificacion.classList.remove("active", tipo);
  }, 3000);
}

// ── VALIDAR SOCIO ────────────────────────────────────────
async function validarEmailSocio(email) {
  try {
    const q = query(collection(db, "socios"), where("mail", "==", email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error validando email socio:", error);
    return false;
  }
}

// ── SIGUIENTE ID ─────────────────────────────────────────
async function obtenerSiguienteID() {
  try {
    const q = query(collection(db, "libros"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1;
    const todosSnapshot = await getDocs(collection(db, "libros"));
    let maxID = 0;
    todosSnapshot.forEach(doc => {
      const id = parseInt(doc.id) || 0;
      if (id > maxID) maxID = id;
    });
    return maxID + 1;
  } catch (error) {
    console.error("Error obteniendo siguiente ID:", error);
    return 1;
  }
}

// ── VALIDACIÓN FORMULARIO ────────────────────────────────
function validarFormulario() {
  let valido = true;
  const campos = [
    "inputAsignatura", "inputCurso", "inputPropietario",
    "inputMailSocio", "inputContacto", "inputEstado"
  ];
  campos.forEach(campo => {
    const elemento      = document.getElementById(campo);
    const errorElemento = document.getElementById("error" + elemento.id.slice(5));
    if (!elemento.value.trim()) {
      elemento.classList.add("error");
      errorElemento.textContent = "Este campo es obligatorio";
      errorElemento.classList.add("show");
      valido = false;
    } else {
      elemento.classList.remove("error");
      errorElemento.classList.remove("show");
    }
  });
  const mailSocio = document.getElementById("inputMailSocio").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailSocio)) {
    const errorElement = document.getElementById("errorMailSocio");
    errorElement.textContent = "Email inválido";
    errorElement.classList.add("show");
    valido = false;
  }
  return valido;
}

// ── MODAL ────────────────────────────────────────────────
function abrirModal() {
  modalFormulario.classList.add("active");
  formAgregarLibro.reset();
  // Pre-rellenar el email del socio autenticado
  if (emailSocioActual) {
    document.getElementById("inputMailSocio").value = emailSocioActual;
  }
}
function cerrarModal() {
  modalFormulario.classList.remove("active");
  formAgregarLibro.reset();
}
modalFormulario.addEventListener("click", (e) => {
  if (e.target === modalFormulario) cerrarModal();
});
document.addEventListener("DOMContentLoaded", () => {
  btnAbrirFormulario.addEventListener("click", abrirModal);
  btnCerrarModal.addEventListener("click", cerrarModal);
});

// ── GUARDAR LIBRO ────────────────────────────────────────
formAgregarLibro.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validarFormulario()) {
    mostrarPopup("Error", "Por favor completa todos los campos obligatorios", "error");
    return;
  }

  const asignatura  = document.getElementById("inputAsignatura").value.trim();
  const curso       = document.getElementById("inputCurso").value.trim();
  const isbn        = document.getElementById("inputISBN").value.trim();
  const propietario = document.getElementById("inputPropietario").value.trim();
  const mailSocio   = document.getElementById("inputMailSocio").value.trim();
  const contacto    = document.getElementById("inputContacto").value.trim();
  const estado      = document.getElementById("inputEstado").value === "true";
  const comentario  = document.getElementById("inputComentario").value.trim();
  const autorizacion = document.getElementById("inputAutorizacion").checked;

  try {
    btnAbrirFormulario.disabled    = true;
    btnAbrirFormulario.textContent = "Guardando...";

    const emailValido = await validarEmailSocio(mailSocio);
    if (!emailValido) {
      mostrarPopup("Error", "El email no coincide con ningún socio registrado", "error");
      return;
    }

    const nuevoID = await obtenerSiguienteID();
    const libro = {
      asignatura, curso, isbn, propietario,
      mail_socio: mailSocio, contacto, estado,
      comentario, autorizacion,
      fecha_creacion: new Date().toISOString(),
      id_libro: nuevoID
    };

    await addDoc(collection(db, "libros"), libro);
    mostrarPopup("¡Éxito!", "Tu libro ha sido agregado correctamente", "success");
    cerrarModal();
    setTimeout(() => cargarLibros(), 500);

  } catch (error) {
    console.error("Error guardando libro:", error);
    mostrarPopup("Error", "No se pudo guardar el libro", "error");
  } finally {
    btnAbrirFormulario.disabled    = false;
    btnAbrirFormulario.textContent = "📝 Añadir mi libro al tablón";
  }
});

// ── CARGAR LIBROS ────────────────────────────────────────
async function cargarLibros() {
  try {
    cuerpoTabla.innerHTML = `<tr><td colspan="8" class="cargando">⏳ Cargando libros...</td></tr>`;
    const snapshot = await getDocs(collection(db, "libros"));
    todosLosLibros = [];
    snapshot.forEach(doc => {
      todosLosLibros.push({ id: doc.id, ...doc.data() });
    });
    todosLosLibros.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    renderizarTabla(todosLosLibros);
  } catch (error) {
    console.error("Error cargando libros:", error);
    cuerpoTabla.innerHTML = `<tr><td colspan="8" class="sin-resultados">⚠️ Error cargando el tablón</td></tr>`;
  }
}

// ── RENDERIZAR TABLA ─────────────────────────────────────
function renderizarTabla(libros) {
  if (libros.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="8" class="sin-resultados">🔍 No se encontraron libros.</td></tr>`;
    contadorResultados.textContent = "";
    return;
  }

  contadorResultados.textContent = `${libros.length} libro${libros.length !== 1 ? "s" : ""} encontrado${libros.length !== 1 ? "s" : ""}`;

  cuerpoTabla.innerHTML = libros.map(libro => {
    const badgeEstado = libro.estado
      ? `<span class="badge-disponible">Disponible</span>`
      : `<span class="badge-nodisp">No disponible</span>`;

    let contactoMostrado = libro.contacto;
    if (!libro.autorizacion) {
      contactoMostrado = contactoMostrado
        .split("")
        .map((char, idx) => (idx === 0 || idx === contactoMostrado.length - 1 ? char : "*"))
        .join("");
    }

    // Botón de borrado solo para el propietario (comparación server-safe en reglas Firestore)
    const btnAcciones = emailSocioActual === libro.mail_socio
      ? `<button class="btn-delete" data-libro-id="${libro.id}">🗑️</button>`
      : `<span style="color:#ccc;">—</span>`;

    return `
      <tr>
        <td>${libro.asignatura || "—"}</td>
        <td>${libro.curso || "—"}</td>
        <td><code>${libro.isbn || "—"}</code></td>
        <td>${badgeEstado}</td>
        <td>${libro.comentario || "—"}</td>
        <td>${libro.propietario || "—"}</td>
        <td>${contactoMostrado || "—"}</td>
        <td>${btnAcciones}</td>
      </tr>`;
  }).join("");

  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      await marcarComoNoDisponible(btn.dataset.libroId);
    });
  });
}

// ── MARCAR NO DISPONIBLE ─────────────────────────────────
async function marcarComoNoDisponible(libroId) {
  try {
    await updateDoc(doc(db, "libros", libroId), { estado: false });
    mostrarPopup("Actualizado", "El libro ha sido marcado como no disponible", "success");
    cargarLibros();
  } catch (error) {
    console.error("Error actualizando libro:", error);
    mostrarPopup("Error", "No se pudo actualizar el libro", "error");
  }
}

// ── BÚSQUEDA ─────────────────────────────────────────────
function buscar(termino) {
  if (!termino.trim()) { renderizarTabla(todosLosLibros); return; }
  const t = termino.toLowerCase();
  librosFiltrados = todosLosLibros.filter(libro =>
    (libro.asignatura || "").toLowerCase().includes(t) ||
    (libro.curso      || "").toLowerCase().includes(t) ||
    (libro.isbn       || "").toLowerCase().includes(t) ||
    (libro.comentario || "").toLowerCase().includes(t) ||
    (libro.propietario || "").toLowerCase().includes(t) ||
    (libro.contacto   || "").toLowerCase().includes(t)
  );
  renderizarTabla(librosFiltrados);
}

btnBuscar.addEventListener("click", () => buscar(inputBusqueda.value.trim()));
inputBusqueda.addEventListener("keydown", (e) => { if (e.key === "Enter") buscar(inputBusqueda.value.trim()); });
btnLimpiar.addEventListener("click", () => { inputBusqueda.value = ""; buscar(""); });
