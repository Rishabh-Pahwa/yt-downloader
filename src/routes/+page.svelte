<script>
	let url = $state('');
	let format = $state('mp4');
	let phase = $state('idle'); // idle | loading | success | error
	let progress = $state(0);
	let statusMsg = $state('');
	let errorMsg = $state('');
	let jobId = $state('');
	let fileName = $state('');
	let fileSize = $state('');
	let pollInterval = $state(null);

	// Client-side validation
	function getUrlError(val) {
		if (!val.trim()) return null;
		try {
			const u = new URL(val);
			const host = u.hostname.replace('www.', '');
			const allowed = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'];
			if (!allowed.includes(host)) return 'Not a YouTube link';
			return null;
		} catch {
			return 'Invalid URL format';
		}
	}

	let urlError = $derived(getUrlError(url));

	const formats = [
		{ id: 'mp4', icon: '🎬', label: 'MP4', desc: 'Video + audio' },
		{ id: 'mp3', icon: '🎵', label: 'MP3', desc: 'Audio only' },
		{ id: 'm4a', icon: '🎧', label: 'M4A', desc: 'High-quality audio' },
		{ id: 'best', icon: '⚡', label: 'Best', desc: 'Highest quality' }
	];

	const statusMessages = {
		queued: 'Queuing…',
		downloading: 'Downloading…',
		processing: 'Processing…',
		finalizing: 'Almost done…',
		complete: 'Ready!'
	};

	function getDisplayProgress(apiProgress, status) {
		if (apiProgress > 0) return apiProgress;
		const statusMin = { queued: 5, downloading: 10, processing: 90, finalizing: 95, complete: 100 };
		return statusMin[status] ?? 0;
	}

	function stopPolling() {
		if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
	}

	async function startDownload() {
		if (!url.trim() || phase === 'loading') return;
		phase = 'loading';
		progress = 0;
		statusMsg = 'Starting…';
		errorMsg = '';

		try {
			const res = await fetch('/api/download', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: url.trim(), format })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to start download');
			jobId = data.jobId;
			pollInterval = setInterval(poll, 1000);
		} catch (err) {
			phase = 'error';
			errorMsg = err.message;
		}
	}

	async function poll() {
		try {
			const res = await fetch(`/api/status/${jobId}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Status check failed');

			progress = getDisplayProgress(data.progress, data.status);
			statusMsg = statusMessages[data.status] ?? 'Working…';

			if (data.status === 'complete') {
				stopPolling();
				fileName = data.fileName;
				fileSize = data.fileSize;
				phase = 'success';
			} else if (data.status === 'error') {
				throw new Error(data.error || 'Download failed');
			}
		} catch (err) {
			stopPolling();
			phase = 'error';
			errorMsg = err.message;
		}
	}

	function saveFile() {
		window.location.href = `/api/file/${jobId}`;
	}

	async function cancelDownload() {
		if (!jobId) return;
		try {
			await fetch(`/api/cancel/${jobId}`, { method: 'POST' });
			reset();
		} catch (err) {
			console.error('Cancel failed', err);
			reset();
		}
	}

	function reset() {
		stopPolling();
		url = ''; format = 'mp4'; phase = 'idle';
		progress = 0; statusMsg = ''; errorMsg = '';
		jobId = ''; fileName = ''; fileSize = '';
	}
</script>

<main>
	<div class="hero">
		<h1>Download YouTube videos</h1>
		<p class="hero-sub">Paste a link, pick a format, save the file. No account needed.</p>
	</div>

	<div class="card">
		{#if phase === 'success'}
			<div class="state-box">
				<div class="state-icon state-icon--success" aria-hidden="true">✓</div>
				<h2>Your file is ready</h2>
				<p class="file-name" title={fileName}>{fileName}</p>
				{#if fileSize}<p class="file-size">{fileSize}</p>{/if}
				<button class="btn btn--red btn--lg" onclick={saveFile}>
					Download file
				</button>
				<button class="btn btn--ghost" onclick={reset}>Download another video</button>
			</div>
		{:else if phase === 'error'}
			<div class="state-box">
				<div class="state-icon state-icon--error" aria-hidden="true">✕</div>
				<h2>Download failed</h2>
				<p class="error-text">{errorMsg}</p>
				<button class="btn btn--red btn--lg" onclick={reset}>Try again</button>
			</div>
		{:else}
			<div class="field">
				<div class="field-header">
					<label class="field-label" for="url-input">YouTube URL</label>
					{#if urlError}
						<span class="field-error-msg">{urlError}</span>
					{/if}
				</div>
				<div class="input-row">
					<input
						id="url-input"
						type="url"
						inputmode="url"
						placeholder="https://youtube.com/watch?v=…"
						bind:value={url}
						onkeydown={(e) => e.key === 'Enter' && !urlError && startDownload()}
						disabled={phase === 'loading'}
						class="url-input"
						class:url-input--error={urlError}
					/>
				</div>
			</div>

			<div class="field">
				<p class="field-label">Format</p>
				<div class="format-grid">
					{#each formats as f}
						<button
							class="format-btn"
							class:format-btn--active={format === f.id}
							onclick={() => (format = f.id)}
							disabled={phase === 'loading'}
						>
							<span class="format-icon" aria-hidden="true">{f.icon}</span>
							<span class="format-label">{f.label}</span>
							<span class="format-desc">{f.desc}</span>
						</button>
					{/each}
				</div>
			</div>

			{#if phase === 'loading'}
				<div class="progress-wrap">
					<div class="progress-meta">
						<span class="progress-msg">{statusMsg}</span>
						<span class="progress-pct">{progress}%</span>
					</div>
					<div class="progress-track" role="progressbar">
						<div class="progress-fill" style="width:{progress}%"></div>
					</div>
				</div>
			{/if}

			<div class="button-group">
				<button
					class="btn btn--red btn--lg {phase === 'loading' ? 'btn--flex' : 'btn--full'}"
					onclick={startDownload}
					disabled={phase === 'loading' || !url.trim() || urlError}
				>
					{#if phase === 'loading'}
						<span class="spinner" aria-hidden="true"></span> Processing…
					{:else}
						Download
					{/if}
				</button>
				{#if phase === 'loading'}
					<button class="btn btn--secondary btn--lg" onclick={cancelDownload}>Cancel</button>
				{/if}
			</div>
		{/if}
	</div>

	<ul class="features">
		<li>⚡ Fast processing</li>
		<li>🔒 No account needed</li>
		<li>🎛 MP4, MP3, M4A &amp; more</li>
	</ul>
</main>

<style>
	main {
		flex: 1;
		max-width: 640px;
		width: 100%;
		margin: 0 auto;
		padding: 40px 16px 60px;
	}

	.hero { text-align: center; margin-bottom: 32px; }
	h1 { font-size: clamp(1.75rem, 5vw, 2.25rem); font-weight: 700; color: #0f0f0f; margin-bottom: 8px; }
	.hero-sub { font-size: 1rem; color: #606060; }

	.card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }

	.field { margin-bottom: 24px; }
	.field-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
	.field-label { display: block; font-size: 0.875rem; font-weight: 600; color: #0f0f0f; }
	.field-error-msg { font-size: 0.75rem; font-weight: 600; color: #cc181e; }

	.url-input { width: 100%; height: 52px; padding: 0 16px; font-family: inherit; font-size: 1rem; border: 1px solid #d9d9d9; border-radius: 8px; outline: none; transition: 0.2s; background: #f9f9f9; }
	.url-input:focus { background: #fff; border-color: #cc181e; box-shadow: 0 0 0 4px rgba(204,24,30,0.1); }
	.url-input--error { border-color: #cc181e !important; background: #fff5f5; }

	.format-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
	.format-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; background: #f9f9f9; border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: 0.2s; color: #606060; }
	.format-btn--active { background: #fff5f5; border-color: #cc181e; color: #cc181e; }
	.format-label { font-size: 0.875rem; font-weight: 600; color: #0f0f0f; }
	.format-btn--active .format-label { color: #cc181e; }
	.format-desc { font-size: 0.75rem; color: #606060; text-align: center; }

	.progress-wrap { margin-bottom: 24px; }
	.progress-meta { display: flex; justify-content: space-between; margin-bottom: 8px; }
	.progress-msg { font-size: 0.875rem; color: #606060; font-weight: 500; }
	.progress-pct { font-size: 0.875rem; font-weight: 700; color: #cc181e; }
	.progress-track { height: 6px; background: #eee; border-radius: 100px; overflow: hidden; }
	.progress-fill { height: 100%; background: #cc181e; transition: width 0.4s ease; }

	.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 24px; font-family: inherit; font-size: 1rem; font-weight: 600; border: none; border-radius: 100px; cursor: pointer; transition: 0.2s; }
	.btn--red { background: #cc181e; color: #fff; }
	.btn--red:hover:not(:disabled) { background: #b01419; }
	.btn--secondary { background: #f2f2f2; color: #0f0f0f; }
	.btn--lg { height: 52px; font-size: 1.0625rem; }
	.btn--full { width: 100%; }
	.btn--flex { flex: 1; }
	.button-group { display: flex; gap: 12px; width: 100%; }
	.btn--ghost { background: transparent; color: #065fd4; padding: 0; height: auto; font-size: 0.875rem; margin-top: 16px; }

	.state-box { display: flex; flex-direction: column; align-items: center; text-align: center; }
	.state-icon { display: flex; width: 64px; height: 64px; border-radius: 50%; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 20px; }
	.state-icon--success { background: #e6f4ea; color: #1e8e3e; }
	.state-icon--error { background: #fce8e6; color: #d93025; }
	.file-name { font-size: 1rem; color: #606060; margin-bottom: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.file-size { font-size: 0.875rem; color: #888; margin-bottom: 24px; }

	.features { list-style: none; display: flex; justify-content: center; gap: 24px; margin-top: 32px; }
	.features li { font-size: 0.875rem; color: #606060; font-weight: 500; }

	.spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	@media (max-width: 480px) {
		.format-grid { grid-template-columns: repeat(2, 1fr); }
		.features { flex-direction: column; align-items: center; gap: 8px; }
	}
</style>
