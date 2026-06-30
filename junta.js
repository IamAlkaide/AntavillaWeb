import { db } from "/app.js";
import {
  collection, getDocs, doc, updateDoc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── GUARD: solo admins ──────────────────────────────────
if (localStorage.getItem("socioActivo") !== "true") {
  window.location.href = "/socios.html";
}
if (localStorage.getItem("esAdmin") !== "true") {
  window.location.href = "/privado.html";
}

// ── ESTADO ─────────────────────────────────────────────
let todosSocios   = [];   // raw de Firestore
let sociosFiltrados = [];
let docIdActual   = null; // docId Firestore del socio en edición
let modoCreacion  = false; // true si el modal está en modo "nuevo socio"

// ── ELEMENTOS DOM ───────────────────────────────────────
const cuerpoTabla   = document.getElementById("cuerpoTabla");
const contador      = document.getElementById("contador");
const inputBuscar   = document.getElementById("inputBuscar");
const filtroActivo  = document.getElementById("filtroActivo");
const filtroCuota   = document.getElementById("filtroCuota");
const btnLimpiar    = document.getElementById("btnLimpiar");
const modalEdicion  = document.getElementById("modalEdicion");
const modalTitulo   = document.getElementById("modalTitulo");
const btnCancelar   = document.getElementById("btnCancelar");
const btnGuardar    = document.getElementById("btnGuardar");
const btnNuevoSocio = document.getElementById("btnNuevoSocio");
const popup         = document.getElementById("popup");

// ── POPUP ───────────────────────────────────────────────
function mostrarPopup(texto, tipo = "success") {
  popup.textContent = texto;
  popup.className = `popup ${tipo}`;
  setTimeout(() => { popup.className = "popup"; }, 3000);
}

// ── HELPER: contar hijos reales ──────────────────────────
function contarHijos(s) {
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    if (s[`Hijo${i}`] && String(s[`Hijo${i}`]).trim() !== "") n++;
  }
  return n;
}

// ── HELPER: siguiente Nº de socio ────────────────────────
function siguienteIdSocio() {
  let max = 0;
  todosSocios.forEach(s => {
    const id = parseInt(s.IdSocio) || 0;
    if (id > max) max = id;
  });
  return max + 1;
}

// ── CARGAR SOCIOS ───────────────────────────────────────
async function cargarSocios() {
  try {
    cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#888;">⏳ Cargando socios...</td></tr>`;
    const snap = await getDocs(collection(db, "socios"));
    todosSocios = [];
    snap.forEach(d => todosSocios.push({ _docId: d.id, ...d.data() }));

    // Ordenar por nº socio
    todosSocios.sort((a, b) => (parseInt(a.IdSocio) || 0) - (parseInt(b.IdSocio) || 0));

    actualizarStats();
    aplicarFiltros();
  } catch (err) {
    console.error(err);
    cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#c62828;">⚠️ Error cargando socios.</td></tr>`;
  }
}

// ── STATS ───────────────────────────────────────────────
function actualizarStats() {
  const activos   = todosSocios.filter(s => s.activo === true).length;
  const inactivos = todosSocios.filter(s => s.activo !== true).length;
  const cuotaOk   = todosSocios.filter(s => s.cuotaPagada === true).length;
  const cuotaNo   = todosSocios.filter(s => s.cuotaPagada !== true).length;

  document.getElementById("statTotal").textContent    = todosSocios.length;
  document.getElementById("statActivos").textContent   = activos;
  document.getElementById("statInactivos").textContent = inactivos;
  document.getElementById("statCuotaOk").textContent   = cuotaOk;
  document.getElementById("statCuotaNo").textContent   = cuotaNo;
}

// ── FILTROS ─────────────────────────────────────────────
function aplicarFiltros() {
  const termino = inputBuscar.value.trim().toLowerCase();
  const fActivo = filtroActivo.value;
  const fCuota  = filtroCuota.value;

  sociosFiltrados = todosSocios.filter(s => {
    // Filtro activo
    if (fActivo !== "") {
      const activo = fActivo === "true";
      if ((s.activo === true) !== activo) return false;
    }
    // Filtro cuota
    if (fCuota !== "") {
      const cuota = fCuota === "true";
      if ((s.cuotaPagada === true) !== cuota) return false;
    }
    // Búsqueda texto
    if (termino) {
      const haystack = [
        s.nombre, s.Apellido1, s.Apellido2,
        s.mail, s.telefono, s.nif,
        String(s.IdSocio || "")
      ].join(" ").toLowerCase();
      if (!haystack.includes(termino)) return false;
    }
    return true;
  });

  renderTabla(sociosFiltrados);
}

// ── RENDER TABLA ─────────────────────────────────────────
function renderTabla(socios) {
  contador.textContent = `${socios.length} socio${socios.length !== 1 ? "s" : ""} encontrado${socios.length !== 1 ? "s" : ""}`;

  if (socios.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#888;">🔍 Sin resultados.</td></tr>`;
    return;
  }

  cuerpoTabla.innerHTML = socios.map(s => {
    const nombre    = `${s.nombre || "—"} ${s.Apellido1 || ""} ${s.Apellido2 || ""}`.trim();
    const activo    = s.activo === true
      ? `<span class="badge-activo">Activo</span>`
      : `<span class="badge-inactivo">Inactivo</span>`;
    const cuota     = s.cuotaPagada === true
      ? `<span class="badge-cuota-ok">✅ Pagada</span>`
      : `<span class="badge-cuota-no">⏳ Pendiente</span>`;
    const numHijos  = contarHijos(s);

    return `
      <tr>
        <td>${s.IdSocio || "—"}</td>
        <td>${s.nombre || "—"}</td>
        <td>${[s.Apellido1, s.Apellido2].filter(Boolean).join(" ") || "—"}</td>
        <td>${s.mail || "—"}</td>
        <td>${s.telefono || "—"}</td>
        <td>${activo}</td>
        <td>${cuota}</td>
        <td style="text-align:center;">${numHijos}</td>
        <td class="col-acciones"><button class="btn-edit" data-docid="${s._docId}">✏️ Editar</button></td>
      </tr>`;
  }).join("");

  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => abrirModalEdicion(btn.dataset.docid));
  });
}

// ── MODAL: ABRIR EN MODO EDICIÓN ─────────────────────────
function abrirModalEdicion(docId) {
  const s = todosSocios.find(x => x._docId === docId);
  if (!s) return;

  modoCreacion = false;
  docIdActual  = docId;
  modalTitulo.textContent = "✏️ Editar socio";

  document.getElementById("editIdSocio").value   = s.IdSocio  || "";
  document.getElementById("editNombre").value    = s.nombre   || "";
  document.getElementById("editApellido1").value = s.Apellido1 || "";
  document.getElementById("editApellido2").value = s.Apellido2 || "";
  document.getElementById("editMail").value      = s.mail     || "";
  document.getElementById("editTelefono").value  = s.telefono || "";
  document.getElementById("editNif").value       = s.nif      || "";
  document.getElementById("editActivo").value    = String(s.activo === true);
  document.getElementById("editCuota").value     = String(s.cuotaPagada === true);
  document.getElementById("editRol").value       = s.rol      || "socio";

  renderHijos(s);

  modalEdicion.classList.add("active");
}

// ── MODAL: ABRIR EN MODO CREACIÓN ────────────────────────
function abrirModalNuevo() {
  modoCreacion = true;
  docIdActual  = null;
  modalTitulo.textContent = "➕ Nuevo socio";

  document.getElementById("editIdSocio").value   = siguienteIdSocio();
  document.getElementById("editNombre").value    = "";
  document.getElementById("editApellido1").value = "";
  document.getElementById("editApellido2").value = "";
  document.getElementById("editMail").value      = "";
  document.getElementById("editTelefono").value  = "";
  document.getElementById("editNif").value       = "";
  document.getElementById("editActivo").value    = "true";
  document.getElementById("editCuota").value     = "false";
  document.getElementById("editRol").value       = "socio";

  renderHijos({});

  modalEdicion.classList.add("active");
}

// ── MODAL: HIJOS ─────────────────────────────────────────
function renderHijos(s) {
  const wrap = document.getElementById("hijosWrap");
  let html = "";
  for (let i = 1; i <= 4; i++) {
    const ordinal = ["Primer", "Segundo", "Tercer", "Cuarto"][i - 1];
    const valor = s[`Hijo${i}`] || "";
    html += `
      <div class="hijo-row">
        <div class="hijo-titulo">${ordinal} hijo</div>
        <div class="form-group full">
          <label>Nombre, apellidos y año de nacimiento</label>
          <input type="text" id="hijo${i}" value="${valor}" placeholder="Ej: Gabriel Buendía Barras 2010">
        </div>
      </div>`;
  }
  wrap.innerHTML = html;
}

// ── MODAL: CERRAR ─────────────────────────────────────────
function cerrarModal() {
  modalEdicion.classList.remove("active");
  docIdActual  = null;
  modoCreacion = false;
}

btnCancelar.addEventListener("click", cerrarModal);
modalEdicion.addEventListener("click", e => { if (e.target === modalEdicion) cerrarModal(); });
btnNuevoSocio.addEventListener("click", abrirModalNuevo);

// ── MODAL: GUARDAR ────────────────────────────────────────
btnGuardar.addEventListener("click", async () => {
  if (!modoCreacion && !docIdActual) return;

  const nombre    = document.getElementById("editNombre").value.trim();
  const apellido1 = document.getElementById("editApellido1").value.trim();
  const mail      = document.getElementById("editMail").value.trim();
  const hijo1     = document.getElementById("hijo1").value.trim();

  if (modoCreacion) {
    if (!nombre || !apellido1 || !mail || !hijo1) {
      mostrarPopup("❌ Nombre, primer apellido, email e Hijo1 son obligatorios", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      mostrarPopup("❌ El email no es válido", "error");
      return;
    }
  }

  btnGuardar.disabled = true;
  btnGuardar.textContent = "Guardando...";

  // Recoger hijos como campos planos Hijo1..Hijo4
  const hijosData = {};
  for (let i = 1; i <= 4; i++) {
    hijosData[`Hijo${i}`] = document.getElementById(`hijo${i}`).value.trim();
  }

  const cambios = {
    nombre,
    Apellido1:    apellido1,
    Apellido2:    document.getElementById("editApellido2").value.trim(),
    mail:         document.getElementById("editMail").value.trim().toLowerCase(),
    telefono:     document.getElementById("editTelefono").value.trim(),
    nif:          document.getElementById("editNif").value.trim().toUpperCase(),
    activo:       document.getElementById("editActivo").value === "true",
    cuotaPagada:  document.getElementById("editCuota").value === "true",
    rol:          document.getElementById("editRol").value,
    ...hijosData,
  };

  try {
    if (modoCreacion) {
      const idSocio = document.getElementById("editIdSocio").value.trim();
      const nuevoDocId = idSocio;

      // Comprobar que no exista ya ese ID de documento
      const existente = await getDoc(doc(db, "socios", nuevoDocId));
      if (existente.exists()) {
        mostrarPopup("❌ Ya existe un socio con ese Nº de socio", "error");
        return;
      }

      const nuevoSocio = { ...cambios, IdSocio: idSocio };
      await setDoc(doc(db, "socios", nuevoDocId), nuevoSocio);

      todosSocios.push({ _docId: nuevoDocId, ...nuevoSocio });
      todosSocios.sort((a, b) => (parseInt(a.IdSocio) || 0) - (parseInt(b.IdSocio) || 0));

      actualizarStats();
      aplicarFiltros();
      cerrarModal();
      mostrarPopup("✅ Socio creado correctamente");
    } else {
      await updateDoc(doc(db, "socios", docIdActual), cambios);

      // Actualizar local
      const idx = todosSocios.findIndex(x => x._docId === docIdActual);
      if (idx !== -1) todosSocios[idx] = { ...todosSocios[idx], ...cambios };

      actualizarStats();
      aplicarFiltros();
      cerrarModal();
      mostrarPopup("✅ Socio actualizado correctamente");
    }
  } catch (err) {
    console.error(err);
    mostrarPopup("❌ Error al guardar los cambios", "error");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = "💾 Guardar cambios";
  }
});

// ── EVENTOS FILTROS ───────────────────────────────────────
inputBuscar.addEventListener("input", aplicarFiltros);
filtroActivo.addEventListener("change", aplicarFiltros);
filtroCuota.addEventListener("change", aplicarFiltros);
btnLimpiar.addEventListener("click", () => {
  inputBuscar.value  = "";
  filtroActivo.value = "";
  filtroCuota.value  = "";
  aplicarFiltros();
});

// ── INIT ──────────────────────────────────────────────────
cargarSocios();
