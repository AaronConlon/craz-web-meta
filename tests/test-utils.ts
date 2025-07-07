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
      let url: string;
      
      if (typeof input === 'string') {
        // 如果是相对路径，添加基础 URL
        url = input.startsWith('/') ? `http://localhost${input}` : input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = input.url;
      }
      
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
