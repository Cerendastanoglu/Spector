/**
 * Security Utilities
 * Provides comprehensive security features including rate limiting,
 * input validation, XSS protection, and more.
 */

import { createHash } from 'crypto';

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// Default rate limit configurations
export const RATE_LIMITS = {
  API_DEFAULT: { windowMs: 60000, maxRequests: 60 },  // 60 req/min
  API_STRICT: { windowMs: 60000, maxRequests: 10 },   // 10 req/min
  API_ANALYTICS: { windowMs: 60000, maxRequests: 30 }, // 30 req/min
  API_PRODUCTS: { windowMs: 60000, maxRequests: 100 }, // 100 req/min
  AUTH: { windowMs: 900000, maxRequests: 5 },         // 5 req/15min
};

/**
 * Check if request should be rate limited
 * Returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.API_DEFAULT
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupRateLimitStore();
  }
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  // Increment count
  entry.count++;
  return { 
    allowed: true, 
    remaining: config.maxRequests - entry.count, 
    resetTime: entry.resetTime 
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit identifier from request (IP + user agent hash)
 */
export function getRateLimitIdentifier(request: Request): string {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Hash to prevent storing raw IPs
  const hash = createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex')
    .substring(0, 16);
  
  return hash;
}

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

/**
 * Sanitize string to prevent XSS attacks
 * Removes potentially dangerous HTML/JS content
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' ? sanitizeObject(item) :
        item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate numeric value within range
 */
export function isValidNumber(
  value: any,
  min?: number,
  max?: number
): boolean {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

/**
 * Validate string length
 */
export function isValidLength(
  str: string,
  minLength?: number,
  maxLength?: number
): boolean {
  if (typeof str !== 'string') return false;
  if (minLength !== undefined && str.length < minLength) return false;
  if (maxLength !== undefined && str.length > maxLength) return false;
  return true;
}

// ============================================================================
// CONTENT SECURITY POLICY
// ============================================================================

/**
 * Generate CSP header value
 */
export function generateCSPHeader(isDevelopment = false): string {
  const directives: string[] = [
    "default-src 'self'",
    // Allow Shopify domains
    "connect-src 'self' https://*.shopify.com https://*.myshopify.com wss://*.shopify.com",
    // Scripts: self + Shopify
    isDevelopment 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.shopify.com"
      : "script-src 'self' https://*.shopify.com",
    // Styles: self + Shopify + Polaris CDN
    "style-src 'self' 'unsafe-inline' https://*.shopify.com https://cdn.shopify.com",
    // Images: data URIs + Shopify CDN
    "img-src 'self' data: https://*.shopify.com https://cdn.shopify.com",
    // Fonts: self + Shopify CDN
    "font-src 'self' data: https://*.shopify.com https://cdn.shopify.com",
    // Frames: only Shopify admin
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
    // Base URI restriction
    "base-uri 'self'",
    // Form action restriction
    "form-action 'self' https://*.shopify.com",
    // Upgrade insecure requests in production
    isDevelopment ? "" : "upgrade-insecure-requests",
  ];
  
  return directives.filter(Boolean).join('; ');
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Add comprehensive security headers to response
 */
export function addSecurityHeaders(
  headers: Headers,
  isDevelopment = false
): void {
  // Content Security Policy
  headers.set('Content-Security-Policy', generateCSPHeader(isDevelopment));
  
  // Strict Transport Security (HTTPS only)
  if (!isDevelopment) {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy but still useful)
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Frame options (redundant with CSP but defense in depth)
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (limit browser features)
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
}

// ============================================================================
// SECRETS REDACTION FOR LOGGING
// ============================================================================

/**
 * Redact sensitive values from objects for safe logging
 */
export function redactSecrets(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  const sensitiveKeys = [
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'sessionId',
    'session_id',
    'privateKey',
    'private_key',
    'encryptionKey',
    'encryption_key',
  ];
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSecrets(item));
  }
  
  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => 
      keyLower.includes(sensitive.toLowerCase())
    );
    
    if (isSensitive && typeof value === 'string') {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSecrets(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

// ============================================================================
// SAFE LOGGING UTILITIES
// ============================================================================

/**
 * Safely log data without exposing secrets
 */
export function safeLog(level: 'log' | 'warn' | 'error', message: string, data?: any): void {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (!isDevelopment && level === 'log') {
    // Skip debug logs in production
    return;
  }
  
  const redactedData = data ? redactSecrets(data) : undefined;
  
  if (redactedData) {
    console[level](message, redactedData);
  } else {
    console[level](message);
  }
}
