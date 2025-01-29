import { getSolidDatasetWithAcl, getAgentAccess, setAgentResourceAccess, saveAclFor } from "@inrupt/solid-client";

export async function setAgentResourceAccess(resourceUrl, agentWebId, accessMode, session) {
  const datasetWithAcl = await getSolidDatasetWithAcl(resourceUrl, { fetch: session.fetch });
  const resourceAcl = getAcl(datasetWithAcl);

  setAgentResourceAccess(resourceAcl, agentWebId, { read: accessMode === "read" }, { fetch: session.fetch });

  await saveAclFor(resourceAcl, { fetch: session.fetch });
}
