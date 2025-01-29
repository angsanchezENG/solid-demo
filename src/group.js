import { createThing, setUrl, saveSolidDatasetAt } from "@inrupt/solid-client";

const REQUESTS_URL = "https://testgruop.solidcommunity.net/inbox/access-requests.ttl";

export async function requestAccess(resourceUrl, session) {
  const request = createThing({ name: "accessRequest" });
  const updatedRequest = setUrl(
    setUrl(request, "http://schema.org/requester", session.info.webId),
    "http://schema.org/resourceRequested",
    resourceUrl
  );

  await saveSolidDatasetAt(REQUESTS_URL, updatedRequest, { fetch: session.fetch });
}
