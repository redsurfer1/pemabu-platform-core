/**
 * Backend initialization entrypoint.
 * Call this before starting the HTTP server to enforce required env vars.
 */
import { assertEnv } from "./lib/init-env";

assertEnv();
