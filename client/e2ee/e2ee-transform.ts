import { CryptoEngine } from '../crypto/crypto';

export class E2EETransformer {
  private crypto: CryptoEngine;
  private frameCounter: number = 0;

  constructor(cryptoEngine: CryptoEngine) {
    this.crypto = cryptoEngine;
  }

  senderTransform() {
    const self = this;
    return new TransformStream({
      async transform(chunk: RTCEncodedVideoFrame, controller) {
        try {
          // --- FIX: DROP FRAME IF NO KEY YET ---
          if (!self.crypto.hasSharedSecret()) {
            // We just return, effectively dropping the frame.
            // This results in black screen until key exchange completes (approx 100-500ms)
            return;
          }

          const iv = new Uint8Array(12);
          const view = new DataView(iv.buffer);
          view.setUint32(0, self.frameCounter++, true);

          const keyData = new Uint8Array(chunk.data);
          const encrypted = await self.crypto.encrypt(keyData, iv);

          const newData = new Uint8Array(iv.length + encrypted.byteLength);
          newData.set(iv, 0);
          newData.set(new Uint8Array(encrypted), iv.length);

          chunk.data = newData.buffer;
          controller.enqueue(chunk);
        } catch (e) {
          console.error("Encryption error:", e);
        }
      }
    });
  }

  receiverTransform() {
    const self = this;
    return new TransformStream({
      async transform(chunk: RTCEncodedVideoFrame, controller) {
        try {
          if (!self.crypto.hasSharedSecret()) return; // Drop if no key

          const data = new Uint8Array(chunk.data);
          const iv = data.slice(0, 12);
          const cipherText = data.slice(12);

          const decrypted = await self.crypto.decrypt(cipherText, iv);

          chunk.data = decrypted;
          controller.enqueue(chunk);
        } catch (e) {
          // Decryption errors are common in the first few milliseconds
          // We suppress them to keep console clean
        }
      }
    });
  }
}