import './styles/global.css';
import { PeerManager } from './webrtc/peerManager';

// CONFIG: REPLACE WITH YOUR RENDER URL
const PROD_SIGNALING_URL = 'wss://talkr-server.onrender.com';

const getSignalingUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'ws://localhost:8080';
    }
    return PROD_SIGNALING_URL;
};

const appState = {
    manager: null as PeerManager | null,
    isMuted: false,
    isVideoOff: false
};

const appContainer = document.getElementById('app') as HTMLDivElement;

// --- VIDEO FACTORY ---
function createVideoElement(isLocal: boolean): HTMLVideoElement {
    const vid = document.createElement('video');
    vid.autoplay = true; vid.playsInline = true;
    if (isLocal) vid.muted = true;

    vid.style.backgroundColor = '#000';

    if (isLocal) {
        // Floating Local Pip
        vid.style.width = '140px';
        vid.style.height = 'auto';
        vid.style.aspectRatio = '16/9';
        vid.style.position = 'absolute';
        vid.style.bottom = '110px';
        vid.style.right = '24px';
        vid.style.zIndex = '10';
        vid.style.borderRadius = '12px';
        vid.style.border = '1px solid rgba(255,255,255,0.1)';
        vid.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        vid.style.transition = 'all 0.3s ease';
        vid.style.objectFit = 'cover';
    } else {
        // Full Screen Remote
        vid.style.objectFit = 'cover';
        vid.style.width = '100%';
        vid.style.height = '100%';
    }
    return vid;
}

// --- CALL INTERFACE ---
async function startCall(roomId: string) {
    appContainer.innerHTML = '';

    // 1. Remote Video Layer
    const remoteVideo = createVideoElement(false);
    appContainer.appendChild(remoteVideo);

    // 2. Grid Overlay (Subtle texture over video)
    const grid = document.createElement('div');
    grid.className = 'grid-bg';
    grid.style.opacity = '0.1'; // Very subtle over video
    appContainer.appendChild(grid);

    // 3. Local Video Layer
    const localVideo = createVideoElement(true);
    appContainer.appendChild(localVideo);

    // 4. Header Bar (Glass)
    const header = document.createElement('div');
    header.style.position = 'absolute';
    header.style.top = '24px';
    header.style.left = '24px';
    header.style.right = '24px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.zIndex = '20';

    // Logo + Room ID
    const infoBadge = document.createElement('div');
    infoBadge.className = 'glass badge';
    infoBadge.innerHTML = `
    <span class="dot" id="statusDot"></span>
    <span style="opacity: 0.7;">ID:</span>
    <span style="font-weight: 700;">${roomId}</span>
  `;

    // Encryption Status
    const encryptBadge = document.createElement('div');
    encryptBadge.className = 'glass badge';
    encryptBadge.innerHTML = `
    <span style="font-size: 14px;">🔒</span>
    <span>E2EE SECURE</span>
  `;

    header.appendChild(infoBadge);
    header.appendChild(encryptBadge);
    appContainer.appendChild(header);

    // 5. Status Overlay (Centered Text)
    const statusText = document.createElement('div');
    statusText.style.position = 'absolute';
    statusText.style.top = '50%';
    statusText.style.left = '50%';
    statusText.style.transform = 'translate(-50%, -50%)';
    statusText.style.fontFamily = 'var(--font-mono)';
    statusText.style.fontSize = '14px';
    statusText.style.letterSpacing = '2px';
    statusText.style.color = 'rgba(255,255,255,0.5)';
    statusText.style.textTransform = 'uppercase';
    statusText.innerHTML = `Waiting for Peer <span style="animation: blink 1s infinite">...</span>`;
    appContainer.appendChild(statusText);

    // 6. Bottom Controls Dock (Glass)
    const dock = document.createElement('div');
    dock.className = 'glass';
    dock.style.position = 'absolute';
    dock.style.bottom = '32px';
    dock.style.left = '50%';
    dock.style.transform = 'translateX(-50%)';
    dock.style.padding = '12px 24px';
    dock.style.borderRadius = '24px';
    dock.style.display = 'flex';
    dock.style.gap = '16px';
    dock.style.zIndex = '20';
    dock.style.animation = 'fade-in-up 0.5s ease-out';

    dock.innerHTML = `
    <button id="copyBtn" class="btn btn-icon" title="Copy Link">🔗</button>
    <button id="vidBtn" class="btn btn-icon btn-active" title="Toggle Video">📷</button>
    <button id="muteBtn" class="btn btn-icon btn-active" title="Toggle Mic">🎤</button>
    <div style="width: 1px; background: var(--glass-border); margin: 0 8px;"></div>
    <button id="endBtn" class="btn btn-icon btn-danger" title="End Call">✕</button>
  `;
    appContainer.appendChild(dock);

    // --- EVENT LOGIC ---

    // Copy
    document.getElementById('copyBtn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        statusText.innerText = 'LINK COPIED TO CLIPBOARD';
        statusText.style.opacity = '1';
        setTimeout(() => statusText.innerText = '', 2000);
    });

    // End
    document.getElementById('endBtn')?.addEventListener('click', () => window.location.href = '/');

    // Start Engine
    const signalUrl = getSignalingUrl();
    appState.manager = new PeerManager(roomId, signalUrl);

    appState.manager.onRemoteStream = (stream) => {
        remoteVideo.srcObject = stream;
        statusText.style.display = 'none';
        document.getElementById('statusDot')?.classList.add('online');
        encryptBadge.style.borderColor = 'var(--signal-green)';
        encryptBadge.style.color = 'var(--signal-green)';
    };

    try {
        await appState.manager.start();
        const localStream = appState.manager.getLocalStream();
        if (localStream) localVideo.srcObject = localStream;

        // Mute/Video Toggles
        document.getElementById('muteBtn')?.addEventListener('click', (e) => {
            const btn = e.target as HTMLElement;
            const track = localStream?.getAudioTracks()[0];
            if (track) {
                appState.isMuted = !appState.isMuted;
                track.enabled = !appState.isMuted;
                btn.classList.toggle('btn-active');
                btn.innerHTML = appState.isMuted ? '🔇' : '🎤';
            }
        });

        document.getElementById('vidBtn')?.addEventListener('click', (e) => {
            const btn = e.target as HTMLElement;
            const track = localStream?.getVideoTracks()[0];
            if (track) {
                appState.isVideoOff = !appState.isVideoOff;
                track.enabled = !appState.isVideoOff;
                btn.classList.toggle('btn-active');
                btn.innerHTML = appState.isVideoOff ? '🚫' : '📷';
            }
        });

    } catch (e) {
        statusText.innerText = 'CONNECTION ERROR';
        statusText.style.color = 'var(--signal-red)';
    }
}

// --- LANDING INTERFACE ---
function renderHome() {
    appContainer.innerHTML = `
    <div class="grid-bg"></div>
    <main style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; position: relative; z-index: 1;">
      
      <div style="margin-bottom: 48px; text-align: center; animation: fade-in-up 0.8s ease-out;">
        <h1 style="font-size: 64px; font-weight: 700; letter-spacing: -3px; margin-bottom: 8px; background: linear-gradient(to bottom, #fff, #888); -webkit-background-clip: text; color: transparent;">TALKR.</h1>
        <p style="font-family: var(--font-mono); color: var(--secondary); font-size: 14px; letter-spacing: 1px;">PRIVATE P2P PROTOCOL</p>
      </div>

      <div class="glass" style="padding: 40px; border-radius: 24px; width: 360px; text-align: center; animation: fade-in-up 1s ease-out;">
        <div style="margin-bottom: 32px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 6px 12px; background: rgba(0,255,148,0.1); border-radius: 20px; color: var(--signal-green); font-size: 12px; font-weight: 600;">
                <span>●</span> ONLINE
            </div>
            <p style="color: #ccc; line-height: 1.6; font-size: 14px;">
                End-to-End Encrypted video calls. <br/>
                No signup. No tracking. No logs.
            </p>
        </div>

        <button id="createBtn" class="btn" style="width: 100%; height: 56px; font-size: 14px;">
            Initialize Meeting <span style="margin-left: 8px">→</span>
        </button>
      </div>

      <div style="position: absolute; bottom: 32px; font-family: var(--font-mono); font-size: 11px; color: var(--secondary); opacity: 0.5;">
        ENCRYPTION: AES-GCM-256 / X25519
      </div>
    </main>
  `;

    document.getElementById('createBtn')?.addEventListener('click', () => {
        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        window.history.pushState({}, '', `?m=${randomId}`);
        startCall(randomId);
    });
}

const urlParams = new URLSearchParams(window.location.search);
const meetingId = urlParams.get('m');
if (meetingId) startCall(meetingId);
else renderHome();