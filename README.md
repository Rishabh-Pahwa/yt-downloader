# ytdl — YouTube Video Downloader

> Download YouTube videos and audio in multiple formats. Fast, free, and no signup required.

<img width="1081" height="890" alt="image" src="https://github.com/user-attachments/assets/a3002981-bf1f-4b43-aea3-138d3fdd1afa" />


## 🎯 Features

- ⚡ **Lightning Fast** — Download videos in seconds
- 🎬 **Multiple Formats** — MP4, MP3, M4A, and best quality options
- 🔒 **Privacy First** — No account, no tracking, no login required
- 📱 **Fully Responsive** — Works seamlessly on mobile, tablet, and desktop
- 🎨 **Clean UI** — Inspired by YouTube's design language
- 🚀 **Single Click** — Paste link, select format, download

## 🌐 Live Demo

👉 **[Visit](https://ytdl.rishabhpahwa.in)**

## 🛠️ Tech Stack

### Frontend
- **SvelteKit** — Modern, reactive UI framework
- **Vite** — Lightning-fast build tool
- **Tailwind CSS** — Utility-first styling (optional)
- **TypeScript** — Type-safe development

### Backend
- **Node.js + Express** — Lightweight, fast server
- **yt-dlp** — Reliable YouTube downloader
- **FFmpeg** — Audio/video processing

### Deployment
- **Render** — Single-container deployment
- **Docker** — Containerized application

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/yt-downloader.git
cd yt-downloader

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` and start downloading!

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview

# Or run with Node.js
npm start
```

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t yt-downloader .
```

### Run Locally

```bash
docker run -p 8000:8000 yt-downloader
```

Visit `http://localhost:8000`

### Deploy to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create New → Web Service
4. Connect your repository
5. Set Runtime to Docker
6. Deploy!

[Detailed Render deployment guide](https://render.com/docs/deploy-node-express-app)

## 📁 Project Structure

```
yt-downloader/
├── src/
│   ├── routes/
│   │   └── +page.svelte          # Main UI component
│   ├── app.html                  # HTML template
│   └── lib/                      # Reusable utilities
├── index.js                      # Express backend server
├── svelte.config.js             # SvelteKit configuration
├── vite.config.js               # Vite configuration
├── Dockerfile                    # Docker configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

## 🔌 API Endpoints

### POST `/api/download`
Start a download job

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "mp4"
}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "queued"
}
```

**Format Options:**
- `mp4` — Best MP4 video quality
- `mp3` — MP3 audio format
- `audio` — High-quality M4A audio
- `best` — Best available format

---

### GET `/api/status/:jobId`
Check download status

**Response:**
```json
{
  "status": "downloading"
}
```

**Status Values:**
- `downloading` — Job in progress
- `completed` — Ready to download
- `error` — Something went wrong

---

### GET `/api/file/:jobId`
Download the processed file

**Response:** Binary file stream with proper headers

---

### GET `/api/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok"
}
```

## 📝 File Naming Convention

Downloaded files are prefixed with `ytd_` followed by the original YouTube video title:

```
ytd_How_To_Learn_JavaScript_2024.mp4
ytd_Chill_Lofi_Hip_Hop_Mix.mp3
```

Special characters and spaces are preserved for readability.

## ⚙️ Environment Variables

Create a `.env` file for local development:

```env
PORT=8000
NODE_ENV=development
```

For Render, configure in the service settings panel.

## 🎨 Customization

### Styling
The UI uses inline CSS with a clean, YouTube-inspired design. To customize:

1. Edit `src/routes/+page.svelte` for colors and spacing
2. Modify the `<style>` block for theme adjustments
3. Update primary color from red (#FF0000) if desired

### Backend Configuration
- **Download timeout:** Line in `index.js` (currently 10 minutes)
- **Temporary storage:** `/tmp/yt_downloads` (configurable)
- **Format mappings:** Edit `formatMap` object in `index.js`

## 🐛 Troubleshooting

### "Download failed" error
- Verify the YouTube URL is public and not age-restricted
- Check internet connection
- Try a different video

### "Port already in use"
```bash
# Change port in environment
PORT=3000 npm run dev
```

### "yt-dlp not found"
Ensure yt-dlp is installed:
```bash
# macOS
brew install yt-dlp

# Ubuntu/Debian
sudo apt-get install yt-dlp

# Or via pip
pip install yt-dlp
```

### File corrupted or won't play
- Verify the download completed (check status)
- Try a different format
- Try re-downloading the same video

## 📊 Performance

- **Average download time:** 30-120 seconds (depends on video length/size)
- **Max file size:** Limited by available disk space on server
- **Concurrent downloads:** Unlimited (queued via job system)
- **API response time:** < 100ms

## 🔒 Security & Privacy

✅ **No data collection** — We don't store URLs or video information  
✅ **No accounts** — No personal data required  
✅ **No tracking** — No analytics or cookies  
✅ **Open source** — Full code transparency  
✅ **HTTPS ready** — Secure by default on Render

## 📜 Legal Notice

This tool is provided for personal use only. Users are responsible for ensuring their downloads comply with:
- YouTube's Terms of Service
- Local copyright laws
- Content creator's permissions

We do not endorse or support downloading copyrighted content without permission.

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution
- 🎨 UI/UX improvements
- 🐛 Bug fixes
- 📚 Documentation
- ⚡ Performance optimizations
- 🌍 Internationalization

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — Amazing YouTube downloader
- [SvelteKit](https://kit.svelte.dev) — The framework
- [Render](https://render.com) — Hosting platform
- [Express.js](https://expressjs.com) — Web framework

## 📧 Support

Have questions or issues?

- 📖 Check the [Troubleshooting](#-troubleshooting) section
- 🐛 Report bugs on [GitHub Issues](https://github.com/yourusername/yt-downloader/issues)
- 💬 Start a [GitHub Discussion](https://github.com/yourusername/yt-downloader/discussions)

## 🗺️ Roadmap

- [ ] Batch download support
- [ ] Playlist downloads
- [ ] Custom filename patterns
- [ ] Download history
- [ ] Queue management UI
- [ ] Subtitle support
- [ ] Video preview thumbnails
- [ ] Advanced format filtering

---

**Made with ❤️ by developers, for the internet**

⭐ If you find this useful, please consider starring the repository!

---

<p align="center">
  <a href="https://github.com/yourusername/yt-downloader">GitHub</a> •
  <a href="https://ytdl.onrender.com">Live Demo</a> •
  <a href="https://github.com/yourusername/yt-downloader/issues">Issues</a>
</p>
