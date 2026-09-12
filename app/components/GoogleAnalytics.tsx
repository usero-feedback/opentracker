export function GoogleAnalytics({ gaId }: { gaId: string }) {
	return (
		<>
			<script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
			<script
				async
				id='gtag-init'
				dangerouslySetInnerHTML={{
					__html: `
      window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${gaId}', {
      page_path: window.location.pathname,
  });
    `,
				}}
			></script>
		</>
	)
}
