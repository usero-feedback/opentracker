const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js'

// The official snippet, added after window load so it never competes with first paint.
export function CloudflareWebAnalytics({ token }: { token: string }) {
	if (!/^[0-9a-f]{32}$/.test(token)) return null
	const beaconConfig = JSON.stringify({ token })

	return (
		<script
			id='cf-web-analytics-init'
			dangerouslySetInnerHTML={{
				__html: `
  (function(){
    function add(){
      var s = document.createElement('script');
      s.defer = true;
      s.src = '${BEACON_SRC}';
      s.setAttribute('data-cf-beacon', '${beaconConfig}');
      document.head.appendChild(s);
    }
    if (document.readyState === 'complete') add();
    else window.addEventListener('load', add, { once: true });
  })();
`,
			}}
		></script>
	)
}
