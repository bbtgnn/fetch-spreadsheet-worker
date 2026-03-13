export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}

		if (request.method !== 'GET') {
			return new Response('Method Not Allowed', {
				status: 405,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}

		const id = url.searchParams.get('id');
		const gid = url.searchParams.get('gid') ?? '0';

		if (!id) {
			return new Response('Missing required query parameter "id".', {
				status: 400,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Content-Type': 'text/plain; charset=utf-8',
				},
			});
		}

		const cacheBuster = Date.now();
		const sheetsUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&tq&gid=${gid}&_=${cacheBuster}`;

		const upstream = await fetch(sheetsUrl);
		const body = await upstream.text();

		return new Response(body, {
			status: upstream.status,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	},
} satisfies ExportedHandler<Env>;
