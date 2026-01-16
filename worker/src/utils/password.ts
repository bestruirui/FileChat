// Password utilities using Web Crypto API

const encoder = new TextEncoder();

/**
 * Hash a password using PBKDF2 with SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const combined = new Uint8Array(salt.length + hashArray.length);
    combined.set(salt);
    combined.set(hashArray, salt.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
        const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
        const salt = combined.slice(0, 16);
        const storedKey = combined.slice(16);

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            256
        );

        const derivedKey = new Uint8Array(derivedBits);

        // Constant-time comparison
        if (derivedKey.length !== storedKey.length) return false;
        let result = 0;
        for (let i = 0; i < derivedKey.length; i++) {
            result |= derivedKey[i] ^ storedKey[i];
        }
        return result === 0;
    } catch {
        return false;
    }
}
