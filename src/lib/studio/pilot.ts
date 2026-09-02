/**
 * The three accounts a deployment is provisioned with.
 *
 * Two facts about the deployment, and nothing else — no storage, no `node:`
 * builtins — because two places need them and they live on opposite sides of
 * the wire: `convex/seed.ts` creates the logins, and the sign-in screen renders
 * a button per account when the deployment runs with `STUDIO_DEMO=1`.
 *
 * One coach, one client she trains, one client training alone: every chair the
 * app has. The password is shared and deliberately not a secret — it exists so
 * a demo deployment can be walked without a mailbox, and `STUDIO_DEMO` is what
 * decides whether the buttons appear. On a real deployment each person changes
 * theirs from the account page.
 */

export const DEMO_PASSWORD = "brigite-studio-2026";

export type DemoAccount = {
  email: string;
  name: string;
  role: "coach" | "client";
  /** Email of the coach this client trains with. Absent: trains alone. */
  coachEmail?: string;
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: "hello@brigitestudio.com", name: "Sara Brigites", role: "coach" },
  {
    email: "iris@brigitestudio.com",
    name: "Iris Fernandes",
    role: "client",
    coachEmail: "hello@brigitestudio.com",
  },
  { email: "guilherme@brigitestudio.com", name: "Guilherme Presas", role: "client" },
];
