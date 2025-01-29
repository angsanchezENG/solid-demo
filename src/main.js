import { Session } from "@inrupt/solid-client-authn-browser";
import {
  getSolidDataset,
  saveSolidDatasetAt,
  createSolidDataset,
  createThing,
  buildThing,
  setThing,
  getThingAll,
  getStringNoLocale,
} from "@inrupt/solid-client";
// Crear una nueva sesión de Solid
const session = new Session();

// Manejar el formulario de inicio de sesión
document.getElementById("loginButton").addEventListener("click", async () => {
  const webId = document.getElementById("webId").value;

  if (!webId) {
    alert("Por favor, introduce tu WebID.");
    return;
  }

  try {
    console.log("Cerrando cualquier sesión activa...");
    await session.logout(); // Forzar cierre de sesión previo
    console.log("Iniciando sesión...");  // Verifica si el proceso de login comienza correctamente

    await session.login({
      oidcIssuer: "https://solidcommunity.net", 
      clientName: "Solid Smart Cities Demo",
      redirectUrl: window.location.href,
    });
    

    console.log("Sesión iniciada con WebID:", session.info.webId);


  } catch (error) {
    console.error("Error durante el inicio de sesión:", error);
  }
});

// Función para mostrar las solicitudes de acceso con el botón "Accept"
async function showRequests() {
  const requestsList = document.getElementById("requestsList");
  requestsList.innerHTML = ''; // Limpiar la lista antes de mostrar las solicitudes

  const userPodUrl = `${session.info.webId.replace("profile/card#me", "")}public/access_requests.ttl`;

  try {
    // Obtener el dataset del archivo access_requests.ttl
    const dataset = await getSolidDataset(userPodUrl, { fetch: session.fetch });

    // Obtener todas las solicitudes (things)
    const things = getThingAll(dataset);

    if (things.length === 0) {
      console.log("No se encontraron solicitudes en el POD.");
      // Si no hay solicitudes, ocultamos la sección de solicitudes
      document.getElementById("requestsSection").style.display = "none";
      return;
    }

    // Si hay solicitudes, mostramos la sección de solicitudes
    document.getElementById("requestsSection").style.display = "block";

    // Procesar cada solicitud
    things.forEach((thing) => {
      const requestDate = getStringNoLocale(thing, "http://schema.org/dateCreated");
      const requester = getStringNoLocale(thing, "http://schema.org/requester");
      const target = getStringNoLocale(thing, "http://schema.org/target");

      // Crear un elemento de lista para mostrar cada solicitud
      const listItem = document.createElement("li");

      // Crear contenido para la solicitud con detalles claros
      listItem.innerHTML = `
        <strong>Solicitud de acceso:</strong><br>
        <strong>Fecha de solicitud:</strong> ${requestDate}<br>
        <strong>Solicitado por:</strong> <a href="${requester}" target="_blank">${requester}</a><br>
        <strong>Archivo al que se solicita acceso:</strong> <a href="${target}" target="_blank">${target}</a><br>
        <button class="acceptButton">Accept</button>
      `;

      // Agregar la solicitud a la lista
      requestsList.appendChild(listItem);

      // Obtener el botón "Accept"
      const acceptButton = listItem.querySelector(".acceptButton");
      acceptButton.addEventListener("click", async () => {
        // Llamar a la función para otorgar acceso de lectura al requester
        await acceptRequest(target, requester);
      });
    });
  } catch (error) {
    console.error("Error al obtener las solicitudes de acceso:", error);
    // Si hay un error al obtener las solicitudes, también ocultamos la sección
    document.getElementById("requestsSection").style.display = "none";
  }
}

async function acceptRequest(target, requester) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.style.display = "block";
  statusMessage.querySelector("p").textContent = "Otorgando permisos de lectura...";

  try {
    // Obtener el dataset del archivo target (este es el archivo que se compartirá)
    const dataset = await getSolidDataset(target, { fetch: session.fetch });

    // Asegurarse de que existe el archivo de permisos ACL para este recurso
    const aclUrl = `${target}.acl`; // La URL del archivo ACL está generalmente terminada en .acl
    let aclDataset;

    try {
      aclDataset = await getSolidDataset(aclUrl, { fetch: session.fetch });
    } catch (error) {
      console.log("El archivo ACL no existe. Creando uno nuevo.");
      aclDataset = createSolidDataset(); // Si no existe, lo creamos
    }

    // Crear una regla ACL para dar permisos de lectura
    const aclRule = buildThing(createThing())
      .addUrl("http://www.w3.org/ns/auth/acl#agent", requester) // El agente es el requester (WebID)
      .addUrl("http://www.w3.org/ns/auth/acl#mode", "http://www.w3.org/ns/auth/acl#Read") // El permiso es de lectura
      .addUrl("http://www.w3.org/ns/auth/acl#accessTo", target) // Especificamos el archivo que se va a compartir
      .build();

    // Añadir la regla ACL al dataset
    aclDataset = setThing(aclDataset, aclRule);

    // Guardar el dataset ACL actualizado
    await saveSolidDatasetAt(aclUrl, aclDataset, { fetch: session.fetch });

    // Mostrar mensaje de éxito
    statusMessage.querySelector("p").textContent = `Permisos de lectura otorgados a: ${requester}`;
    console.log(`Permisos de lectura otorgados a: ${requester}`);

    // Aquí puedes actualizar el estado de la solicitud para reflejar que se ha aceptado
    // (por ejemplo, eliminarla de la lista o actualizarla)
  } catch (error) {
    console.error("Error al otorgar los permisos:", error);
    statusMessage.querySelector("p").textContent = `Error: ${error.message}`;
  }
}



// Agregar manejador para el botón de solicitud de acceso
document.getElementById("requestAccessButton").addEventListener("click", async () => {
  const fileUrl = document.getElementById("fileUrl").value;
  const statusMessage = document.getElementById("statusMessage");

  if (!fileUrl) {
    alert("Por favor, introduce la URL del archivo.");
    return;
  }

  // Extraer información del usuario propietario del archivo
  const ownerPodUrl = "https://angsanchez.solidcommunity.net/public/access_requests.ttl";

  try {
    // Mostrar mensaje de carga
    statusMessage.style.display = "block";
    statusMessage.querySelector("p").textContent = "Enviando solicitud de acceso...";

    // Cargar o crear el dataset `access_requests.ttl`
    let dataset;
    try {
      dataset = await getSolidDataset(ownerPodUrl, { fetch: session.fetch });
    } catch {
      console.log("El archivo access_requests.ttl no existe. Creando uno nuevo.");
      dataset = createSolidDataset();
    }

    // Crear una nueva solicitud como un Thing RDF
    const requestId = `${ownerPodUrl}#request-${Date.now()}`;
    const accessRequest = buildThing(createThing({ url: requestId }))
      .addStringNoLocale("http://schema.org/target", fileUrl)
      .addStringNoLocale("http://schema.org/requester", session.info.webId)
      .addStringNoLocale("http://schema.org/dateCreated", new Date().toISOString())
      .build();

    // Agregar la solicitud al dataset
    dataset = setThing(dataset, accessRequest);

    // Guardar el dataset actualizado en el POD de angsanchez
    await saveSolidDatasetAt(ownerPodUrl, dataset, { fetch: session.fetch });

    // Mostrar mensaje de éxito
    statusMessage.querySelector("p").textContent = `Solicitud enviada con éxito para el archivo: ${fileUrl}`;
    console.log("Solicitud registrada:", requestId);
  } catch (error) {
    console.error("Error al enviar la solicitud de acceso:", error);
    statusMessage.querySelector("p").textContent = `Error: ${error.message}`;
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await session.logout();
  console.log("Sesión cerrada.");
  location.reload(); // Recargar la página para reiniciar la interfaz
});


// Manejar redirección después del login
(async () => {
  console.log("Manejando la redirección..."); // Verifica si llega a este punto

  await session.handleIncomingRedirect();

  if (session.info.isLoggedIn) {
    console.log("Usuario autenticado con WebID:", session.info.webId); // Verifica si se ha autenticado correctamente
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("userSection").style.display = "block";
    document.getElementById("accessRequestSection").style.display = "block";
    document.getElementById("logoutButton").style.display = "block";
    console.log("Llamando a showFiles()...");
    showFiles();
    showRequests();
  } else {
    console.log("No se ha podido autenticar al usuario.");
  }
})();



// Función para mostrar archivos después de iniciar sesión
async function showFiles() {
  // Extraer la raíz del dominio desde el WebID
  const webIdUrl = new URL(session.info.webId);
  const datasetUrl = `${webIdUrl.origin}/public/`;
  console.log(datasetUrl); // Verifica que esta URL sea correcta
  console.log("Obteniendo el dataset desde:", datasetUrl); // Verifica que esta URL sea correcta

  try {
    // Obtener el dataset del POD
    const dataset = await getSolidDataset(datasetUrl, { fetch: session.fetch });

    console.log("Dataset obtenido:", dataset); // Verifica si el dataset se obtiene correctamente

    const things = getThingAll(dataset); // Obtener todos los "things" (objetos) del dataset

    if (things.length === 0) {
      console.log("No se encontraron archivos en el POD.");
    } else {
      console.log("Archivos encontrados:", things);
    }

    // Mostrar los archivos en el POD
    const fileList = document.getElementById("fileList");
    fileList.innerHTML = ''; // Limpiar la lista antes de mostrar los archivos

    things.forEach((thing) => {
        const listItem = document.createElement("li");

        // Crear un enlace <a> para cada URL
        const link = document.createElement("a");
        link.href = thing.url; // Asignar la URL del recurso
        link.textContent = thing.url; // Texto visible del enlace
        link.target = "_blank"; // Abrir en una nueva pestaña
  
        listItem.appendChild(link); // Agregar el enlace al elemento de la lista
        fileList.appendChild(listItem); // Agregar el elemento de la lista al DOM
    });
  } catch (error) {
    console.error("Error al obtener los archivos:", error);
  }
}
