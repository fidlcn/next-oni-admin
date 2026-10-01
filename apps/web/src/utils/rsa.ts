/**
 * RSA-OAEP 密码加密 —— 与服务端 RSA 私钥解密配对（oaepHash SHA-256）
 * 登录与修改密码共用
 */

/** 将 ArrayBuffer 转为 base64 字符串 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** 从 PEM 格式字符串导入 RSA 公钥 */
export async function importPublicKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

/** 获取并导入服务端 RSA 公钥 */
export async function fetchPublicKey(): Promise<CryptoKey> {
  const res = await fetch('/v1/auth/public-key');
  const data = await res.json();
  return importPublicKey(data.data.publicKey);
}

/** 用公钥加密明文，返回 base64 密文 */
export async function encryptWithKey(
  key: CryptoKey,
  plaintext: string,
): Promise<string> {
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(plaintext),
  );
  return arrayBufferToBase64(encrypted);
}
