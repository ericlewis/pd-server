export default {
	async fetch(request: Request) {
		const url = new URL(request.url);
		const { pathname, searchParams } = url;
		if (pathname === '/api/v2/firmware/') {
			const response = await fetch('https://github.com/scratchminer/pd-ota/releases/latest/download/update.json');
			const update = JSON.parse(new TextDecoder('utf-8').decode(await response.arrayBuffer()));

			if (searchParams.get("current_version") === update.version) {
			return new Response(null, { status: 204 });
			}

			const url = (await fetch(update.url, { redirect: 'manual' })).headers.get('location');

			return new Response(JSON.stringify({ ...update, url }), {
				headers: { 'content-type': 'application/json' },
			});
		} else {
			// redirect everything else to panic
			const newUrl = new URL(url);
			newUrl.hostname = 'play.date';
			const newReq = new Request(newUrl, request);
			newReq.headers.set('host', 'play.date');
			newReq.headers.delete('cf-connecting-ip');
			newReq.headers.delete('cf-ipcountry');
			newReq.headers.delete('cf-ray');
			newReq.headers.delete('cf-visitor');
			newReq.headers.delete('x-forwarded-proto');
			newReq.headers.delete('x-real-ip');
			return fetch(newReq);
		}
	},
};
