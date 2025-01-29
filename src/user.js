import { getSolidDataset, getThingAll, getUrl, removeThing } from "@inrupt/solid-client";
import { setAgentResourceAccess } from "./acl"; // Función para modificar permisos

const REQUESTS_URL = "https://angsanchez.solidcommunity.net/inbox/access-requests.ttl";

export async function getRequests(session) {
  const dataset = await getSolidDataset(REQUESTS_URL, { fetch: session.fetch });
  const requests = getThingAll(dataset).map((thing) => ({
    requester: getUrl(thing, "http://schema.org/requester"),
    resource: getUrl(thing, "http://schema.org/resourceRequested"),
  }));
  return requests;
}

export async function deleteResource(resourceUrl, session) {
    try {
      // Realiza una solicitud HTTP DELETE
      const response = await session.fetch(resourceUrl, { method: "DELETE" });
      if (response.ok) {
        console.log(`Recurso ${resourceUrl} eliminado con éxito.`);
      } else {
        console.error(`Error al eliminar el recurso: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Hubo un error al intentar borrar el recurso:", error);
    }
}
  
export async function acceptRequest(request, session) {
  // Otorgar acceso al grupo (esto asume que el grupo está identificado por `request.requester`)
  await setAgentResourceAccess(request.resource, request.requester, "read", session);

  // Opcional: Eliminar la solicitud del archivo
  const dataset = await getSolidDataset(REQUESTS_URL, { fetch: session.fetch });
  const updatedDataset = removeThing(dataset, request);
  await saveSolidDatasetAt(REQUESTS_URL, updatedDataset, { fetch: session.fetch });
}
