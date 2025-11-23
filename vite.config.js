import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: 'client', // Sets client/index.html as entry
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        target: 'esnext' // Required for Top-level await & Web Crypto
    },
    server: {
        port: 5173,
        strictPort: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './client')
        }
    }
});