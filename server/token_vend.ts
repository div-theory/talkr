import * as crypto from 'crypto';

// Configuration (Env vars in production)
const TURN_SECRET = process.env.TURN_SECRET || "talkr-local-secret";
// In production, this would be your Oracle IP, e.g., "turn:123.45.67.89:3478"
const TURN_URL = process.env.TURN_URL || "turn:127.0.0.1:3478";

export function getTurnCredentials(username: string = "talkr-user") {
    // Credentials valid for 24 hours
    const unixTimeStamp = Math.floor(Date.now() / 1000) + 24 * 3600;
    
    const usernameWithTime = `${unixTimeStamp}:${username}`;
    
    const hmac = crypto.createHmac('sha1', TURN_SECRET);
    hmac.setEncoding('base64');
    hmac.write(usernameWithTime);
    hmac.end();
    const password = hmac.read();

    return {
        username: usernameWithTime,
        credential: password,
        urls: [TURN_URL]
    };
}