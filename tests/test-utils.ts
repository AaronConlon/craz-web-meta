import { describe, expect, test } from 'vitest';
import { app } from '../src/index';

type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | object;
};

export function createTestApp() {
  return {
    async fetch(input: string | URL | Request, init: FetchOptions = {}) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      const requestInit: RequestInit = {
        method: init.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      };

      if (init.body) {
        requestInit.body = typeof init.body === 'string' 
          ? init.body 
          : JSON.stringify(init.body);
      }

      const request = new Request(url, requestInit);
      return app.fetch(request);
    },
  };
}

export function withAuthHeader(token: string) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
}

export function expectStatus(response: Response, status: number) {
  expect(response.status).toBe(status);
  return response;
}

export async function expectJson(response: Response, expected: any) {
  const body = await response.json();
  expect(body).toEqual(expected);
  return body;
}
