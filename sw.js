(function () {
	const cacheVersion = '20200307-resource';
	const localVersion = '202003071356-offline';

	const localUrl = [
		'/local/',
		'/local/offline.html'
	];
	
	var config = false;
	
	function processLocal(request) {
		event.respondWith(caches.match(request).then((response) => {
			if (response) {
				return response;
			}
			return fetch(request).then((response) => {
				caches.open(localVersion).then(c => c.put(request, response.clone()));
				return response;
			});
		}));
	}

	self.addEventListener('fetch', event => {
		if (!config) {
			return;
		}
		const request = event.request;
		const url = new URL(request.url);
		if (url.pathname.startsWith('/local/')) {
			processLocal(request);
		} else {
			if (url.hostname == config.endpointHost /* bad design */ || url.hostname == location.hostname) {
				url.hostname = config.base;
			} else if (!config.proxyHosts.includes(url.hostname)) {
				return;
			}
			let init = {};
			for (let k in request) {
				if (k != 'url' && k != 'mode') {
					init[k] = request[k];
				}
			}
			init.credentials = 'include';
			if (request.method == 'POST' || request.method == 'PUT') {
				event.respondWith(request.blob().then(data => {
					init.body = data;
					return fetch(new Request(config.endpoint + url.hostname + url.pathname, init));
				}));
			} else {
				event.respondWith(fetch(new Request(config.endpoint + url.hostname + url.pathname, init)).then(r => {
					console.info(r);
					return r;
				}));
			}
		}
	});

	self.addEventListener('install', event => {
		event.waitUntil(self.skipWaiting());
	});

	self.addEventListener('activate', event => {
		event.waitUntil(caches.keys()
			.then(keys => keys.filter(k => k != localVersion))
			.then(keys => Promise.all(keys.map(k => caches.delete(k))))
			.then(() => caches.open(localVersion).then((cache) => cache.addAll(localUrl))));
	});

	self.addEventListener('message', event => {
		config = event.data.config;
	});
})();
