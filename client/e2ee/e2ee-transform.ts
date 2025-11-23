import { CryptoEngine } from '../crypto/crypto';

// Worker-like context for Insertable Streams
export class E2EETransformer {
  private crypto: CryptoEngine;
  private frameCounter: number = 0;

  constructor(cryptoEngine: CryptoEngine) {
    this.crypto = cryptoEngine;
  }

  /**
   * Encrypts outgoing video frames
   */
  senderTransform() {
    const self = this;
    return new TransformStream({
      async transform(chunk: RTCEncodedVideoFrame, controller) {
        try {
          // Construct IV (12 bytes) from frame counter
          // In prod: mix with synchronization source (SSRC)
          const iv = new Uint8Array(12);
          const view = new DataView(iv.buffer);
          view.setUint32(0, self.frameCounter++, true); 

          const keyData = new Uint8Array(chunk.data);
          const encrypted = await self.crypto.encrypt(keyData, iv);

          // Pack IV + Encrypted Data
          const newData = new Uint8Array(iv.length + encrypted.byteLength);
          newData.set(iv, 0);
          newData.set(new Uint8Array(encrypted), iv.length);

          chunk.data = newData.buffer;
          controller.enqueue(chunk);
        } catch (e) {
          console.error("Encryption failed:", e);
          // On error, drop frame to maintain privacy
        }
      }
    });
  }

  /**
   * Decrypts incoming video frames
   */
  receiverTransform() {
    const self = this;
    return new TransformStream({
      async transform(chunk: RTCEncodedVideoFrame, controller) {
        try {
          const data = new Uint8Array(chunk.data);
          
          // Extract IV (first 12 bytes)
          const iv = data.slice(0, 12);
          const cipherText = data.slice(12);

          const decrypted = await self.crypto.decrypt(cipherText, iv);
          
          chunk.data = decrypted;
          controller.enqueue(chunk);
        } catch (e) {
          console.error("Decryption failed:", e);
        }
      }
    });
  }
}