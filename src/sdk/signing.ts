/**
 * Portald SDK - Request Signing
 * 
 * Signs outgoing requests to Portald with HMAC-SHA256.
 * This proves to Portald that the request came from an authorized merchant site.
 */

import { createHmac } from 'crypto';

const SIGNATURE_VERSION = 'v1';

export interface SignedHeaders {
  'x-portald-site-id': string;
  'x-portald-timestamp': string;
  'x-portald-signature': string;
}

/**
 * Compute HMAC-SHA256 signature for a request.
 * 
 * @param webhookSecret - Your site's webhook secret from Portald
 * @param timestamp - Unix timestamp in seconds
 * @param body - Raw request body as string
 * @returns Signature in format "v1=<hex>"
 */
export function computeSignature(
  webhookSecret: string,
  timestamp: string,
  body: string,
): string {
  const payload = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', webhookSecret);
  hmac.update(payload);
  return `${SIGNATURE_VERSION}=${hmac.digest('hex')}`;
}

/**
 * Generate signed headers for a Portald API request.
 * 
 * @param siteId - Your MerchantSite ID from Portald
 * @param webhookSecret - Your site's webhook secret
 * @param body - Request body (will be JSON.stringify'd if object)
 * @returns Headers to include in your request
 */
export function signRequest(
  siteId: string,
  webhookSecret: string,
  body: string | object,
): SignedHeaders {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = computeSignature(webhookSecret, timestamp, bodyString);

  return {
    'x-portald-site-id': siteId,
    'x-portald-timestamp': timestamp,
    'x-portald-signature': signature,
  };
}
