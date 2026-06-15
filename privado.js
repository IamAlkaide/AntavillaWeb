// Comprobación de sesión — aplica a privado.html
const socioActivo    = localStorage.getItem("socioActivo");
const nombreCompleto = localStorage.getItem("nombreCompleto");

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
  window.location.href = "/socios.html";
});
