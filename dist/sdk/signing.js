"use strict";
/**
 * Portald SDK - Request Signing
 *
 * Signs outgoing requests to Portald with HMAC-SHA256.
 * This proves to Portald that the request came from an authorized merchant site.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSignature = computeSignature;
exports.signRequest = signRequest;
const crypto_1 = require("crypto");
const SIGNATURE_VERSION = 'v1';
/**
 * Compute HMAC-SHA256 signature for a request.
 *
 * @param webhookSecret - Your site's webhook secret from Portald
 * @param timestamp - Unix timestamp in seconds
 * @param body - Raw request body as string
 * @returns Signature in format "v1=<hex>"
 */
function computeSignature(webhookSecret, timestamp, body) {
    const payload = `${timestamp}.${body}`;
    const hmac = (0, crypto_1.createHmac)('sha256', webhookSecret);
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
function signRequest(siteId, webhookSecret, body) {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = computeSignature(webhookSecret, timestamp, bodyString);
    return {
        'x-portald-site-id': siteId,
        'x-portald-timestamp': timestamp,
        'x-portald-signature': signature,
    };
}
