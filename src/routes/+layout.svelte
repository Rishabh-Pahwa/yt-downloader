<script>
	import favicon from "$lib/assets/favicon.svg";
	let { children } = $props();
	import "../app.css";
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- ── Header ─────────────────────────────────────────────────────────────── -->
<header>
	<div class="header-inner">
		<a href="/" class="logo" aria-label="ytdl home">
			<span class="logo-yt">yt</span><span class="logo-dl">dl</span>
		</a>
		<span class="header-badge">Free · No signup</span>
	</div>
</header>

{@render children()}

<!-- ── Footer ────────────────────────────────────────────────────────────── -->
<footer>
	<div class="footer-links">
		<a href="/privacy">Privacy Policy</a>
		<a href="/terms">Terms of Service</a>
	</div>
	<p>ytdl is an open-source tool. Not affiliated with YouTube or Google.</p>
</footer>

<style>
	/* ── Reset & base (Modern YouTube Vibe) ────────────────────────────── */
	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

	:global(body) {
		font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
		font-size: 16px;
		line-height: 1.5;
		color: #0f0f0f;
		background: #f9f9f9;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		-webkit-font-smoothing: antialiased;
	}

	:global(a) { color: #065fd4; text-decoration: none; }
	:global(a:hover) { text-decoration: underline; }

	/* ── Header ─────────────────────────────────────────────────────────── */
	header {
		background: #fff;
		border-bottom: 1px solid #e5e5e5;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-inner {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 16px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		text-decoration: none;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.75px;
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.logo-yt { color: #0f0f0f; }
	.logo-dl {
		color: #fff;
		background: #cc181e; 
		padding: 2px 8px;
		border-radius: 8px;
		margin-left: 2px;
	}

	.header-badge {
		font-size: 0.75rem;
		color: #606060;
		background: #f2f2f2;
		border-radius: 4px;
		padding: 4px 10px;
		font-weight: 500;
	}

	/* ── Footer ──────────────────────────────────────────────────────────── */
	footer { margin-top: auto; padding: 40px 24px 24px; text-align: center; border-top: 1px solid #e5e5e5; background: #fff; }
	footer p { font-size: 0.8125rem; color: #888; }
	
	.footer-links {
		display: flex;
		justify-content: center;
		gap: 20px;
		margin-bottom: 12px;
	}
	.footer-links a {
		font-size: 0.875rem;
		color: #606060;
		font-weight: 500;
	}
</style>
