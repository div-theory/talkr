# Talkr Deployment Runbook

## 1. Client Deployment (Vercel)
The client is a static SPA. Vercel handles the build automatically.

1.  **Push code to GitHub**.
2.  **Import Project in Vercel**.
3.  **Build Settings**:
    *   Framework Preset: `Vite`
    *   Root Directory: `Talkr` (if that is your repo root)
    *   Build Command: `npm run build`
    *   Output Directory: `dist` (Note: vite.config.js builds to ../dist, so ensure Vercel looks there)
4.  **Environment Variables**: None required for client (Signaling URL is currently hardcoded in `main.ts`, update it before pushing).

## 2. Server Deployment (Oracle Always Free)
You need a VM (Ubuntu 22.04) with Ports `80`, `443`, `3478` (UDP/TCP), and `5349` (TCP) open.

### A. Install Dependencies
```bash
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx coturn
sudo npm install -g typescript ts-node pm2