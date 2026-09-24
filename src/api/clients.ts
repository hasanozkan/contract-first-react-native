// Typed clients for both services. The types are generated from each
// service's committed OpenAPI contract (scripts/contracts.sh); a hand-written
// type for a wire shape does not exist in this app.
import createClient from 'openapi-fetch';

import type { paths as AssistantPaths, components as AssistantComponents } from './assistant.gen';
import type { paths as LibraryPaths, components as LibraryComponents } from './library.gen';
import { mockAssistantFetch, mockLibraryFetch } from './mock';

export type LibrarySchemas = LibraryComponents['schemas'];
export type AssistantSchemas = AssistantComponents['schemas'];

const libraryUrl = process.env.EXPO_PUBLIC_LIBRARY_URL;
const assistantUrl = process.env.EXPO_PUBLIC_ASSISTANT_URL;

/**
 * Expo's global fetch (SDK 57) rejects the Request object openapi-fetch hands
 * it ("Unsupported BodyInit type"): pass url + init with a text body instead.
 * Found by the LIVE integration test — the mocks read the Request themselves
 * and could not see it.
 */
async function expoFetch(request: Request): Promise<Response> {
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return fetch(request.url, {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: hasBody ? await request.text() : undefined,
  });
}

/** Mock-first: without a URL the app runs against typed in-memory mocks. */
export const mockMode = { library: !libraryUrl, assistant: !assistantUrl };

export const library = createClient<LibraryPaths>({
  baseUrl: libraryUrl ?? 'http://mock.library',
  fetch: libraryUrl ? expoFetch : mockLibraryFetch,
});

export const assistant = createClient<AssistantPaths>({
  baseUrl: assistantUrl ?? 'http://mock.assistant',
  fetch: assistantUrl ? expoFetch : mockAssistantFetch,
});

/** Problem documents carry a stable `code`; the UI shows it, never a stack trace. */
export function problemCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return error.code;
  return 'unexpected_error';
}
