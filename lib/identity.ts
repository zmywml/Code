import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthenticatedUser = { id: string; name: string };

type RuntimeEnv = Cloudflare.Env & {
  LOCAL_PREVIEW?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
};

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function accessKeySet(teamDomain: string) {
  let keySet = keySets.get(teamDomain);
  if (!keySet) {
    keySet = createRemoteJWKSet(
      new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
    );
    keySets.set(teamDomain, keySet);
  }
  return keySet;
}

export async function authenticatedUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const runtime = env as RuntimeEnv;

  if (runtime.LOCAL_PREVIEW === "true") {
    const id = request.headers.get("x-preview-user") || "preview-owner";
    return { id, name: id };
  }

  const sitesUserId = request.headers.get("oai-authenticated-user-id");
  const sitesEmail = request.headers.get("oai-authenticated-user-email");
  if (sitesUserId && sitesEmail) return { id: sitesUserId, name: sitesEmail };

  const teamDomain = runtime.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = runtime.CF_ACCESS_AUD?.trim();
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!teamDomain || !audience || !assertion) return null;

  try {
    const { payload } = await jwtVerify(assertion, accessKeySet(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience,
    });
    const id = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!id || !email) return null;
    return { id: `cf-access:${id}`, name: email };
  } catch (error) {
    console.error(
      "access-jwt-verification-failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}
