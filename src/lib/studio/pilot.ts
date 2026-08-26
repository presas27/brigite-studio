/**
 * Who the pilot runs with.
 *
 * Two facts about the deployment, and nothing else — no storage, no `node:`
 * builtins — because three places need them and they live on opposite sides of
 * the wire: the sign-in screen renders a button per pilot account, the Convex
 * demo provider checks a posted address against this roster before handing out
 * a session, and provisioning creates the accounts.
 *
 * Addresses are on the studio's own domain because the pilot signs in by
 * button, not by email. Swap them for the real ones when the magic link has to
 * reach an inbox.
 */

export const COACH_EMAIL = "hello@brigitestudio.com";

export const PILOT_CLIENTS = [
  { email: "iris@brigitestudio.com", name: "Iris Fernandes" },
  { email: "guilherme@brigitestudio.com", name: "Guilherme Presas" },
] as const;
