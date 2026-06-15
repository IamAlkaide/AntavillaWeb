// ========== COMPROBACIÓN DE SESIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
  const socioActivo    = localStorage.getItem("socioActivo");
  const nombreCompleto = localStorage.getItem("nombreCompleto");

  if (!socioActivo || socioActivo !== "true") {
    window.location.href = "/no-acceso.html";
    return;
  }

  // Mostrar contenido solo tras validar sesión
  document.getElementById("contenidoPrivado").style.display = "block";

  document.getElementById("saludo").textContent =
    `¡Bienvenido/a, ${nombreCompleto}! 👋`;

  document.getElementById("btnSalir").addEventListener("click", () => {
    localStorage.removeItem("socioEmail");
    localStorage.removeItem("socioActivo");
    localStorage.removeItem("nombreCompleto");
    localStorage.removeItem("idSocio");
    window.location.href = "/socios.html";
  });
});
