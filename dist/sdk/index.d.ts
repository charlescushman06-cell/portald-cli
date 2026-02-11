/**
 * Portald Merchant SDK
 *
 * Server-side SDK for merchants integrating with Portald.
 *
 * @example
 * ```typescript
 * import { createPortaldClient } from 'portald/sdk';
 *
 * const portald = createPortaldClient();
 *
 * // Verify webhook signature
 * const isValid = portald.verifyWebhookSignature(rawBody, timestamp, signature);
 *
 * // Verify payment was processed
 * const result = await portald.verifyPayment(actionId);
 * if (result.verified) {
 *   // Safe to fulfill the order
 * }
 * ```
 */
export { signRequest, computeSignature, type SignedHeaders } from './signing.js';
export { PortaldClient, createPortaldClient, type PortaldConfig, type VerifyPaymentResult, type WebhookPayload, } from './client.js';
