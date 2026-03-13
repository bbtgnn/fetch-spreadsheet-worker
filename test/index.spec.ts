import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';

describe('Google Sheets proxy worker', () => {
	it('proxies Google Sheets response with id and gid (unit style)', async () => {
		const mockBody = 'mock sheets response';
		const mockResponse = new Response(mockBody, { status: 200 });

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

		const request = new Request('https://example.com/?id=sheet-id&gid=123');
		const ctx = createExecutionContext();

		const response = await worker.fetch(request as any, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const calledUrl = new URL((fetchSpy.mock.calls[0] as [RequestInfo | URL])[0] as string);
		expect(calledUrl.hostname).toBe('docs.google.com');
		expect(calledUrl.pathname).toBe('/spreadsheets/d/sheet-id/gviz/tq');
		expect(calledUrl.searchParams.get('gid')).toBe('123');
		expect(calledUrl.searchParams.get('tqx')).toBe('out:json');
		expect(calledUrl.searchParams.get('_')).not.toBeNull();

		expect(response.status).toBe(200);
		expect(await response.text()).toBe(mockBody);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

		fetchSpy.mockRestore();
	});

	it('returns 400 when id is missing', async () => {
		const request = new Request('https://example.com/?gid=123');
		const ctx = createExecutionContext();

		const response = await worker.fetch(request as any, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect(await response.text()).toContain('Missing required query parameter "id"');
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('defaults gid to 0 when not provided', async () => {
		const mockBody = 'mock sheets response without gid';
		const mockResponse = new Response(mockBody, { status: 200 });

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

		const request = new Request('https://example.com/?id=sheet-id');
		const ctx = createExecutionContext();

		const response = await worker.fetch(request as any, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const calledUrl = new URL((fetchSpy.mock.calls[0] as [RequestInfo | URL])[0] as string);
		expect(calledUrl.searchParams.get('gid')).toBe('0');

		expect(response.status).toBe(200);
		expect(await response.text()).toBe(mockBody);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

		fetchSpy.mockRestore();
	});

	it('handles CORS preflight via OPTIONS', async () => {
		const request = new Request('https://example.com/?id=sheet-id&gid=123', {
			method: 'OPTIONS',
		});
		const ctx = createExecutionContext();

		const response = await worker.fetch(request as any, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
		expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
	});
});
