export class CryptoEngine {
  private keyPair: CryptoKeyPair | null = null;
  private sharedSecret: CryptoKey | null = null;

  async generateKeyPair(): Promise<CryptoKeyPair> {
    this.keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
    return this.keyPair;
  }

  async exportPublicKey(): Promise<JsonWebKey> {
    if (!this.keyPair) throw new Error("Keys not generated");
    return await window.crypto.subtle.exportKey("jwk", this.keyPair.publicKey);
  }

  async importPeerKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
  }

  async deriveSharedSecret(peerPublicKey: CryptoKey): Promise<void> {
    if (!this.keyPair) throw new Error("No local keypair");

    const rawSecret = await window.crypto.subtle.deriveBits(
      { name: "ECDH", public: peerPublicKey },
      this.keyPair.privateKey,
      256
    );

    this.sharedSecret = await window.crypto.subtle.importKey(
      "raw",
      rawSecret,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );

    console.log("[Crypto] Shared secret established.");
  }

  // --- NEW HELPER ---
  public hasSharedSecret(): boolean {
    return this.sharedSecret !== null;
  }

  async encrypt(chunk: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
    if (!this.sharedSecret) throw new Error("No shared secret");
    return await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.sharedSecret,
      chunk
    );
  }

  async decrypt(chunk: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
    if (!this.sharedSecret) throw new Error("No shared secret");
    return await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      this.sharedSecret,
      chunk
    );
  }
}