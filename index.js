import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/tmp/yt_downloads';
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// In-memory job store
const jobs = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure download dir exists
await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

// ── SvelteKit static files (served from build output) ───────────────────────
const clientDir = path.join(__dirname, 'build', 'client');
try {
	await fs.access(clientDir);
	app.use(express.static(clientDir, { maxAge: '1y', immutable: true }));
} catch {
	// not built yet — dev mode skips this
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_FORMATS = ['mp4', 'mp3', 'm4a', 'best'];

function formatToytdlp(fmt) {
	const map = {
		mp4: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
		mp3: 'bestaudio[ext=m4a]/bestaudio',
		m4a: 'bestaudio[ext=m4a]/bestaudio',
		best: 'bestvideo+bestaudio/best'
	};
	return map[fmt] ?? 'best';
}

function formatBytes(bytes) {
	if (!bytes || bytes === 0) return null;
	const units = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let size = bytes;
	while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
	return `${size.toFixed(1)} ${units[i]}`;
}

function isValidYouTubeUrl(url) {
	try {
		const u = new URL(url);
		const host = u.hostname.replace('www.', '');
		return (
			host === 'youtube.com' ||
			host === 'm.youtube.com' ||
			host === 'music.youtube.com' ||
			host === 'youtu.be'
		);
	} catch {
		return false;
	}
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
	res.json({ ok: true, jobs: jobs.size });
});

app.post('/api/download', async (req, res) => {
	const { url, format = 'mp4' } = req.body ?? {};

	if (!url || typeof url !== 'string') {
		return res.status(400).json({ error: 'Missing URL.' });
	}
	if (!isValidYouTubeUrl(url)) {
		return res.status(400).json({ error: 'Only youtube.com and youtu.be URLs are supported.' });
	}
	if (!VALID_FORMATS.includes(format)) {
		return res.status(400).json({ error: `Invalid format. Choose one of: ${VALID_FORMATS.join(', ')}` });
	}

	const jobId = uuidv4();
	// Each job gets its own subdirectory so the title-based filename is unambiguous
	const jobDir = path.join(DOWNLOAD_DIR, jobId);
	await fs.mkdir(jobDir, { recursive: true });

	// yt-dlp sanitises %(title)s for the filesystem automatically
	const outputTemplate = path.join(jobDir, 'yt-dl_%(title)s.%(ext)s');

	const job = {
		id: jobId,
		status: 'queued',
		progress: 0,
		error: null,
		filePath: null,
		fileName: null,
		fileSize: null,
		jobDir,
		createdAt: Date.now(),
		proc: null // Store the process to allow cancellation
	};
	jobs.set(jobId, job);

	runDownload(job, url, format, outputTemplate);

	res.json({ jobId });
});

app.post('/api/cancel/:jobId', async (req, res) => {
	const job = jobs.get(req.params.jobId);
	if (!job) return res.status(404).json({ error: 'Job not found.' });

	if (job.proc) {
		job.proc.kill('SIGKILL');
		job.status = 'error';
		job.error = 'Download cancelled by user.';
	}

	// Clean up files
	try {
		await fs.rm(job.jobDir, { recursive: true, force: true });
	} catch (err) {
		console.error('[Cancel cleanup error]', err.message);
	}

	res.json({ ok: true });
});

app.get('/api/status/:jobId', (req, res) => {
	const job = jobs.get(req.params.jobId);
	if (!job) return res.status(404).json({ error: 'Job not found.' });

	res.json({
		status: job.status,
		progress: job.progress,
		error: job.error,
		fileName: job.fileName,
		fileSize: job.fileSize
	});
});

app.get('/api/file/:jobId', async (req, res) => {
	const job = jobs.get(req.params.jobId);
	if (!job) return res.status(404).json({ error: 'Job not found.' });
	if (job.status !== 'complete') return res.status(409).json({ error: 'File not ready yet.' });

	try {
		await fs.access(job.filePath);
		res.download(job.filePath, job.fileName, (err) => {
			if (!err) {
				setTimeout(() => {
					fs.rm(job.jobDir, { recursive: true, force: true }).catch(() => { });
					jobs.delete(job.id);
				}, 5000);
			}
		});
	} catch {
		res.status(404).json({ error: 'File no longer available.' });
	}
});

// SvelteKit SSR handler — must come after API routes
const svelteHandler = path.join(__dirname, 'build', 'handler.js');
try {
	await fs.access(svelteHandler);
	const { handler } = await import(svelteHandler);
	app.use(handler);
} catch {
	// dev mode: SvelteKit handles its own server
}

// ── Background Cleanup ───────────────────────────────────────────────────────

// Every 15 minutes, remove jobs older than 30 minutes to prevent storage leaks
setInterval(async () => {
	const now = Date.now();
	const expirationTime = 30 * 60 * 1000; // 30 minutes

	for (const [jobId, job] of jobs.entries()) {
		if (now - job.createdAt > expirationTime) {
			console.log(`[Cleanup] Removing expired job: ${jobId}`);
			try {
				await fs.rm(job.jobDir, { recursive: true, force: true });
				jobs.delete(jobId);
			} catch (err) {
				console.error(`[Cleanup error] ${jobId}:`, err.message);
			}
		}
	}
}, 15 * 60 * 1000);

// ── Download runner ──────────────────────────────────────────────────────────

function runDownload(job, url, format, outputTemplate) {
	const ytdlpArgs = [
		'--format', formatToytdlp(format),
		'--output', outputTemplate,
		'--no-playlist',
		'--progress',
		'--newline', // Makes parsing progress easier
		url
	];

	if (format === 'mp3') {
		ytdlpArgs.unshift('--extract-audio', '--audio-format', 'mp3');
	}

	const proc = spawn('yt-dlp', ytdlpArgs, { timeout: TIMEOUT_MS });
	job.proc = proc;

	job.status = 'downloading';

	let stdout = '';
	let stderr = '';
	let spawnError = false;

	proc.stdout.on('data', (chunk) => {
		const str = chunk.toString();
		stdout += str;

		// Split by newline OR carriage return (yt-dlp uses \r for progress bars)
		const lines = str.split(/\r?\n|\r/);

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			// Look specifically for the [download] line with a percentage
			// Example: "[download]  12.5% of 100MB..."
			const progressMatch = trimmed.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);

			if (progressMatch) {
				const percent = parseFloat(progressMatch[1]);
				// Only update if it's a real number and moving forward
				if (!isNaN(percent)) {
					job.progress = percent;
				}

				if (trimmed.includes('100%')) {
					job.status = 'finalizing';
					job.progress = 100;
				} else {
					job.status = 'downloading';
				}
			} else if (trimmed.includes('[ExtractAudio]') || trimmed.includes('[ffmpeg]') || trimmed.includes('[Merger]')) {
				job.status = 'processing';
				if (job.progress < 95) job.progress = 95;
			}
		}
	});

	proc.stderr.on('data', (chunk) => {
		stderr += chunk.toString();
	});

	proc.on('error', (err) => {
		spawnError = true;
		job.status = 'error';
		job.error = err.code === 'ENOENT'
			? 'yt-dlp is not installed on the server.'
			: err.message;
		console.error('[yt-dlp spawn error]', err.message);
	});

	proc.on('close', async (code) => {
		if (spawnError) return;

		if (code !== 0) {
			console.error('[yt-dlp stderr]', stderr);
			console.error('[yt-dlp stdout]', stdout);
			job.status = 'error';
			job.error = parseYtdlpError(stderr || stdout) || `Download failed (exit ${code}).`;
			// Clean up the empty job dir
			fs.rm(job.jobDir, { recursive: true, force: true }).catch(() => { });
			return;
		}

		try {
			const files = await fs.readdir(job.jobDir);
			let match = files.find((f) => f.startsWith('yt-dl_'));
			if (!match) throw new Error('Output file not found after download.');

			// Replace spaces with underscores for better system compatibility
			const sanitizedMatch = match.replace(/\s+/g, '_');
			if (sanitizedMatch !== match) {
				await fs.rename(path.join(job.jobDir, match), path.join(job.jobDir, sanitizedMatch));
				match = sanitizedMatch;
			}

			const filePath = path.join(job.jobDir, match);
			const stat = await fs.stat(filePath);

			job.filePath = filePath;
			job.fileName = match; // Now has underscores instead of spaces
			job.fileSize = formatBytes(stat.size);
			job.status = 'complete';
		} catch (err) {
			job.status = 'error';
			job.error = err.message;
		}
	});
}

function parseYtdlpError(text) {
	if (!text) return null;
	if (text.includes('Video unavailable')) return 'This video is unavailable.';
	if (text.includes('Private video')) return 'This video is private.';
	if (text.includes('age-restricted')) return 'This video is age-restricted and cannot be downloaded.';
	if (text.includes('not a valid URL')) return 'The URL does not appear to be a valid YouTube link.';
	if (text.includes('Sign in')) return 'This video requires sign-in and cannot be downloaded.';
	const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('WARNING'));
	return lines[0] || null;
}

// ── Start ────────────────────────────────────────────────────────────────────

createServer(app).listen(PORT, () => {
	console.log(`ytdl server running on port ${PORT}`);
});
