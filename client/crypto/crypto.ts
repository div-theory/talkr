// Utilities for Web Crypto API (SubtleCrypto)

export class CryptoEngine {
  private keyPair: CryptoKeyPair | null = null;
  private sharedSecret: CryptoKey | null = null;
  
  // 1. Generate local ECDH Keypair (X25519 or P-256 as fallback if browser lacks X25519)
  async generateKeyPair(): Promise<CryptoKeyPair> {
    // Using P-256 for maximum browser compatibility in Vanilla JS 
    // (X25519 is newer in some contexts, P-256 is safe standard for this POC)
    this.keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
    return this.keyPair;
  }

  // 2. Export Public Key to send to peer
  async exportPublicKey(): Promise<JsonWebKey> {
    if (!this.keyPair) throw new Error("Keys not generated");
    return await window.crypto.subtle.exportKey("jwk", this.keyPair.publicKey);
  }

  // 3. Import Peer's Public Key
  async importPeerKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
  }

  // 4. Derive Shared Secret (AES-GCM Key)
  async deriveSharedSecret(peerPublicKey: CryptoKey): Promise<void> {
    if (!this.keyPair) throw new Error("No local keypair");

    // ECDH derivation
    const rawSecret = await window.crypto.subtle.deriveBits(
      { name: "ECDH", public: peerPublicKey },
      this.keyPair.privateKey,
      256
    );

    // Import derived bits as AES-GCM key
    this.sharedSecret = await window.crypto.subtle.importKey(
      "raw",
      rawSecret,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    
    console.log("[Crypto] Shared secret established via E2EE.");
  }

  // 5. Encrypt Data (IV is based on frame counter for streams)
  async encrypt(chunk: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
    if (!this.sharedSecret) throw new Error("No shared secret");
    return await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.sharedSecret,
      chunk
    );
  }

  // 6. Decrypt Data
  async decrypt(chunk: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
    if (!this.sharedSecret) throw new Error("No shared secret");
    return await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      this.sharedSecret,
      chunk
    );
  }
}