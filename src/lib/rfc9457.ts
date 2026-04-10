/**
 * RFC 9457 Problem Details for HTTP APIs — machine-readable error responses.
 * All public-facing API routes should catch errors and return this format.
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  retry_after?: number; // Seconds; optional for rate-limit or transient errors
  [key: string]: unknown;
}

export const PROBLEM_JSON_CONTENT_TYPE = "application/problem+json";

const DEFAULT_TYPE = "about:blank";

export function problem(
  status: number,
  title: string,
  options: { type?: string; detail?: string; retry_after?: number; [k: string]: unknown } = {}
): ProblemDetails {
  const { type = DEFAULT_TYPE, detail, retry_after, ...ext } = options;
  return {
    type,
    title,
    status,
    ...(detail != null && { detail }),
    ...(retry_after != null && { retry_after }),
    ...ext,
  };
}

export function problemJson(
  status: number,
  title: string,
  options: { type?: string; detail?: string; retry_after?: number; [k: string]: unknown } = {}
): string {
  return JSON.stringify(problem(status, title, options));
}

export const PEMABU_PROBLEM_URI = "https://docs.pemabu.com/errors";

export function pemabuProblem(
  status: number,
  title: string,
  errorCode: string,
  detail?: string,
  retry_after?: number
): ProblemDetails {
  return problem(status, title, {
    type: `${PEMABU_PROBLEM_URI}#${errorCode}`,
    detail,
    retry_after,
    errorCode,
  });
}
