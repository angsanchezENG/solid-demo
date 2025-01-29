import { Session } from "@inrupt/solid-client-authn-browser";

const session = new Session();

export async function login(redirectUrl) {
  await session.login({
    oidcIssuer: "https://solidcommunity.net",
    clientName: "Solid Demo",
    redirectUrl,
  });
}

export async function handleRedirect() {
  await session.handleIncomingRedirect();
  return session.info.isLoggedIn;
}

export function getSession() {
  return session;
}
