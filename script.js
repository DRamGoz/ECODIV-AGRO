// 1. Seleccionamos todos los elementos de la pantalla
const pantalla = document.getElementById('pantalla');
const tarjeta = document.getElementById('tarjeta');
const planta = document.getElementById('planta');
const estadoTexto = document.getElementById('estado-texto');
const btnOn = document.getElementById('btn-on');
const btnOff = document.getElementById('btn-off');

// URL Real de tu Google Apps Script
const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbwuyWAmH2GpcQwIIJGyB3BweeCX6QW_Q_sDcwVczOnw4cb85_3bNOX2ScBeX95_cfL6/exec";

// Función blindada para enviar el estado a Google Sheets
function registrarEnSheets(nuevoEstado) {
  estadoTexto.textContent = "CONECTANDO...";

  // Convertimos a "on" o "off" en minúsculas como espera tu doGet
  const parametroAction = nuevoEstado === "ON" ? "on" : "off";
  const urlPeticion = `${URL_GOOGLE_SHEETS}?action=${parametroAction}`;

  // Usamos inyección de etiqueta <script> para saltarnos los bloqueos CORS.
  // Esto es necesario si abres el archivo index.html haciendo doble clic (protocolo file://),
  // ya que los navegadores bloquean las peticiones 'fetch' a servidores externos por seguridad.
  const disparadorScript = document.createElement('script');
  disparadorScript.src = urlPeticion;

  document.body.appendChild(disparadorScript);

  // Al finalizar, eliminamos el script para mantener el documento limpio
  disparadorScript.onload = function() {
    disparadorScript.remove();
  };
  disparadorScript.onerror = function() {
    disparadorScript.remove();
  };

  // Confirmamos el estado visual en pantalla de forma fluida
  setTimeout(() => {
    estadoTexto.textContent = `RIEGO | ${nuevoEstado}`;
  }, 1000);
}

// Funciones visuales puras (cambian la pantalla pero NO realizan envíos repetidos)
function activarRiegoSinEnviar() {
  estadoTexto.textContent = "RIEGO | ON";
  pantalla.style.backgroundColor = "#3d3d3d";
  tarjeta.style.backgroundColor = "#55f14d";
  planta.play();
  btnOn.style.opacity = "1";
  btnOff.style.opacity = "0.6";
}

function desactivarRiegoSinEnviar() {
  estadoTexto.textContent = "RIEGO | OFF";
  pantalla.style.backgroundColor = "#838383";
  tarjeta.style.backgroundColor = "#b0aeae";
  planta.stop();
  btnOn.style.opacity = "0.6";
  btnOff.style.opacity = "1";
}

let temporizadorRiego = null;
let intervaloCuentaAtras = null;

// Función para limpiar todos los contadores activos
function limpiarTemporizadores() {
  if (temporizadorRiego) {
    clearTimeout(temporizadorRiego);
    temporizadorRiego = null;
  }
  if (intervaloCuentaAtras) {
    clearInterval(intervaloCuentaAtras);
    intervaloCuentaAtras = null;
  }
}

// 2. Definimos la función para ENCENDER el riego
function activarRiego() {
  limpiarTemporizadores();

  activarRiegoSinEnviar();
  registrarEnSheets("ON");

  // Iniciamos la cuenta regresiva visual de 3 segundos
  let segundosRestantes = 3;
  estadoTexto.textContent = `RIEGO | ON (${segundosRestantes}s)`;

  intervaloCuentaAtras = setInterval(() => {
    segundosRestantes--;
    if (segundosRestantes > 0) {
      estadoTexto.textContent = `RIEGO | ON (${segundosRestantes}s)`;
    } else {
      clearInterval(intervaloCuentaAtras);
      intervaloCuentaAtras = null;
    }
  }, 1000);

  // Temporizador de 3 segundos para el apagado visual definitivo
  temporizadorRiego = setTimeout(() => {
    desactivarRiegoSinEnviar();
    temporizadorRiego = null;
  }, 3000);
}

// 3. Definimos la función para APAGAR el riego (manual)
function desactivarRiego() {
  limpiarTemporizadores();
  desactivarRiegoSinEnviar();
  registrarEnSheets("OFF");
}

// Función para obtener el estado actual desde Google Sheets de forma periódica
function sincronizarEstado() {
  // Si el temporizador de 3 segundos está corriendo, ignoramos el sondeo para evitar parpadeos
  if (temporizadorRiego) return;
  
  fetch(URL_GOOGLE_SHEETS)
    .then(response => {
      if (!response.ok) throw new Error("Error en respuesta");
      return response.json();
    })
    .then(data => {
      // Doble verificación: si se activó el temporizador durante la petición, no hacemos nada
      if (temporizadorRiego) return;

      console.log("Estado sincronizado:", data);
      if (data && data.estado === "ON") {
        activarRiegoSinEnviar();
      } else {
        desactivarRiegoSinEnviar();
      }
    })
    .catch(error => {
      console.warn("No se pudo sincronizar el estado:", error);
    });
}

// 4. Escuchamos los clics de los botones de forma limpia
btnOn.addEventListener('click', activarRiego);
btnOff.addEventListener('click', desactivarRiego);

// 5. Sincronizamos el estado inicial al cargar la web y lo repetimos cada 5 segundos
sincronizarEstado();
setInterval(sincronizarEstado, 5000);