/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activitySearches from "../activitySearches.js";
import type * as chats from "../chats.js";
import type * as communities from "../communities.js";
import type * as crons from "../crons.js";
import type * as emailContent from "../emailContent.js";
import type * as emails from "../emails.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as matching from "../matching.js";
import type * as messages from "../messages.js";
import type * as requests from "../requests.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activitySearches: typeof activitySearches;
  chats: typeof chats;
  communities: typeof communities;
  crons: typeof crons;
  emailContent: typeof emailContent;
  emails: typeof emails;
  events: typeof events;
  files: typeof files;
  http: typeof http;
  matching: typeof matching;
  messages: typeof messages;
  requests: typeof requests;
  users: typeof users;
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
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
