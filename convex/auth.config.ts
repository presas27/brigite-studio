/**
 * Which issuer Convex trusts for identity tokens.
 *
 * `CONVEX_SITE_URL` is this deployment's own HTTP origin, because Convex Auth
 * mints and verifies its own tokens — `auth.addHttpRoutes` in `http.ts` is what
 * serves the OIDC discovery and JWKS documents this points at.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
