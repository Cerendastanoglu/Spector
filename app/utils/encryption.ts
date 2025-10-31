import crypto from 'crypto';
import { logger } from "~/utils/logger";

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _TAG_LENGTH = 16; // 128 bits

/**
 * Generate or retrieve encryption key
 * In production, this should be stored securely (e.g., environment variable, AWS KMS, etc.)
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  // SECURITY: Fail in production if encryption key is not set
  if (process.env.NODE_ENV === 'production' && !keyString) {
    throw new Error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable must be set in production. Data cannot be encrypted securely without it.');
  }
  
  // Use default key only in development
  const key = keyString || 'default-dev-key-change-in-production-32chars';
  
  // Warn if using default key in production (shouldn't reach here due to check above)
  if (process.env.NODE_ENV === 'production' && key === 'default-dev-key-change-in-production-32chars') {
    throw new Error('CRITICAL SECURITY ERROR: Cannot use default encryption key in production');
  }
  
  if (key.length < 32) {
    throw new Error('Encryption key must be at least 32 characters long');
  }
  
  return Buffer.from(key.slice(0, 32), 'utf8');
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: any): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('spector-analytics', 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const combined = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    
    return combined;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encryptedData: string): any {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('spector-analytics', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random key for encryption
 * Use this to generate your production encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Hash data for integrity checking
 */
export function hashData(data: any): string {
  const dataString = JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}
