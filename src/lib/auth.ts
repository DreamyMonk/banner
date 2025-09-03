import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
const alg = 'HS256';

export async function sign(payload: any, secretKey: string): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24 * 30; // 30 days
    const key = new TextEncoder().encode(secretKey);

    return new SignJWT({...payload})
        .setProtectedHeader({ alg })
        .setExpirationTime(exp)
        .setIssuedAt(iat)
        .setNotBefore(iat)
        .sign(key);
}

export async function verify(token: string, secretKey: string): Promise<any> {
    const key = new TextEncoder().encode(secretKey);
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: [alg]
        });
        return payload;
    } catch (e) {
        console.error('JWT Verification failed:', e);
        return null;
    }
}
