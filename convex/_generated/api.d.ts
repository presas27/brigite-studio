/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as coaching from "../coaching.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as library from "../library.js";
import type * as model_authz from "../model/authz.js";
import type * as model_library from "../model/library.js";
import type * as model_shape from "../model/shape.js";
import type * as phases from "../phases.js";
import type * as photos from "../photos.js";
import type * as plan from "../plan.js";
import type * as programs from "../programs.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as youtube from "../youtube.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  coaching: typeof coaching;
  email: typeof email;
  http: typeof http;
  leads: typeof leads;
  library: typeof library;
  "model/authz": typeof model_authz;
  "model/library": typeof model_library;
  "model/shape": typeof model_shape;
  phases: typeof phases;
  photos: typeof photos;
  plan: typeof plan;
  programs: typeof programs;
  seed: typeof seed;
  users: typeof users;
  youtube: typeof youtube;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
