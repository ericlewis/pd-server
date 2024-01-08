// Helper function to clean up headers
function cleanHeaders(headers: Headers) {
	const headersToClean = [
		'cf-connecting-ip',
		'cf-ipcountry',
		'cf-ray',
		'cf-visitor',
		'x-forwarded-proto',
		'x-real-ip',
	];
	headersToClean.forEach(header => headers.delete(header));
}

// Function to rewrite the request with new URL and cleaned headers
function rewriteRequest(url: URL, originalRequest: Request) {
	const newUrl = new URL(url);
	newUrl.hostname = 'play.date';

	const newRequest = new Request(newUrl, originalRequest);
	newRequest.headers.set('host', 'play.date');
	cleanHeaders(newRequest.headers);

	return newRequest;
}

// Function to fetch firmware update info
async function fetchFirmwareUpdate(request: Request) {
	const newReq = rewriteRequest(new URL(request.url), request);
	const updateResponse = await fetch(newReq);
	if (updateResponse.status === 204) {
		return updateResponse;
	}
	const updateJSON = await updateResponse.json();
	if (updateJSON?.version) {
		const githubResponse = await fetch(`https://github.com/scratchminer/pd-ota/releases/download/${updateJSON.version}/update.json`);
		const update = await githubResponse.json();
		if (updateJSON.md5 === update.stock_md5 && updateJSON.version === update.version) {
			// rev. A
			const redirectUrl = (await fetch(update.dvt1, { redirect: 'manual' })).headers.get('location');
			return new Response(JSON.stringify({ ...update, md5: update.dvt1_md5, url: redirectUrl }), {
				headers: { 'content-type': 'application/json' },
			});
		}
		else if (updateJSON.version === update.version) {
			// rev. B
			const redirectUrl = (await fetch(update.h7d1, { redirect: 'manual' })).headers.get('location');
			return new Response(JSON.stringify({ ...update, md5: update.h7d1_md5, url: redirectUrl }), {
				headers: { 'content-type': 'application/json' },
			});
		}
	}

	// either we're on the latest version or the GitHub action hasn't patched it yet
	return new Response(null, { status: 204 });
}

// Function to handle all other requests by redirecting
async function redirectToPanic(request: Request) {
	const newReq = rewriteRequest(new URL(request.url), request);
	const response = await fetch(newReq);
	const responseText = await response.text();

	// replaceAll is valid in the context we are using it (Cloudflare workers)
	// @ts-ignore-next-line
	const fixedResponseText = responseText.replaceAll(`"https://play.date/api/`, `"https://sydh.date/api/`);

	return new Response(fixedResponseText, response);
}

// Main fetch handler
export default {
	async fetch(request: Request) {
		const { pathname } = new URL(request.url);

		if (pathname === '/api/v2/firmware/') {
			return fetchFirmwareUpdate(request);
		}

		return redirectToPanic(request);
	},
};
