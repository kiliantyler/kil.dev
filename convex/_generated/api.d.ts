/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _utils from "../_utils.js";
import type * as auth from "../auth.js";
import type * as authConfigProviders from "../authConfigProviders.js";
import type * as dev_seedScores from "../dev/seedScores.js";
import type * as gameSessions from "../gameSessions.js";
import type * as http from "../http.js";
import type * as petGallery from "../petGallery.js";
import type * as petGalleryIndexes from "../petGalleryIndexes.js";
import type * as petGalleryValidators from "../petGalleryValidators.js";
import type * as scoreSubmission from "../scoreSubmission.js";
import type * as scores from "../scores.js";
import type * as workOSAuthKitActions from "../workOSAuthKitActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _utils: typeof _utils;
  auth: typeof auth;
  authConfigProviders: typeof authConfigProviders;
  "dev/seedScores": typeof dev_seedScores;
  gameSessions: typeof gameSessions;
  http: typeof http;
  petGallery: typeof petGallery;
  petGalleryIndexes: typeof petGalleryIndexes;
  petGalleryValidators: typeof petGalleryValidators;
  scoreSubmission: typeof scoreSubmission;
  scores: typeof scores;
  workOSAuthKitActions: typeof workOSAuthKitActions;
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
  workOSAuthKit: import("@convex-dev/workos-authkit/_generated/component.js").ComponentApi<"workOSAuthKit">;
};
