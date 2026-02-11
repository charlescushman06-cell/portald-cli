"use strict";
/**
 * Portald SDK - Client
 *
 * Server-side SDK for merchants to interact with Portald.
 * All requests are signed with HMAC to prove authenticity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortaldClient = void 0;
exports.createPortaldClient = createPortaldClient;
const signing_js_1 = require("./signing.js");
/**
 * Portald SDK Client
 *
 * Use this in your backend to:
 * - Verify webhook signatures from Portald
 * - Verify that a payment was actually processed
 */
class PortaldClient {
    siteId;
    webhookSecret;
    baseUrl;
    constructor(config) {
        this.siteId = config.siteId;
        this.webhookSecret = config.webhookSecret;
        this.baseUrl = config.baseUrl ?? 'https://www.portald.ai/api';
    }
    /**
     * Verify a webhook payload signature.
     *
     * Call this when you receive a webhook from Portald to ensure
     * it's authentic and hasn't been tampered with.
     *
     * @param payload - Raw request body as string
     * @param timestamp - Value of x-portald-timestamp header
     * @param signature - Value of x-portald-signature header
     * @returns true if signature is valid
     */
    verifyWebhookSignature(payload, timestamp, signature) {
        const { computeSignature } = require('./signing.js');
        // Check timestamp freshness (5 minute window)
        const timestampNum = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        const age = now - timestampNum;
        if (age < 0 || age > 300) {
            return false;
        }
        const expectedSignature = computeSignature(this.webhookSecret, timestamp, payload);
        return signature === expectedSignature;
    }
    /**
     * Verify that a payment was actually processed by Portald.
     *
     * Call this after receiving a webhook to double-check the payment
     * status directly with Portald. This prevents spoofed webhooks.
     *
     * @param actionId - The action_id from the webhook
     * @returns Verification result with action details
     */
    async verifyPayment(actionId) {
        const body = JSON.stringify({ action_id: actionId });
        const signedHeaders = (0, signing_js_1.signRequest)(this.siteId, this.webhookSecret, body);
        try {
            const response = await fetch(`${this.baseUrl}/merchant/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...signedHeaders,
                },
                body,
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                return {
                    verified: false,
                    error: error.error ?? `HTTP ${response.status}`,
                };
            }
            const data = await response.json();
            return {
                verified: data.verified ?? false,
                action: data.action,
                error: data.error,
            };
        }
        catch (error) {
            return {
                verified: false,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }
    /**
     * Create signed headers for a custom API request.
     *
     * Use this if you need to make custom API calls to Portald.
     *
     * @param body - Request body
     * @returns Headers to include in your request
     */
    createSignedHeaders(body) {
        return (0, signing_js_1.signRequest)(this.siteId, this.webhookSecret, body);
    }
}
exports.PortaldClient = PortaldClient;
/**
 * Create a Portald client from environment variables.
 *
 * Expects:
 * - PORTALD_SITE_ID
 * - PORTALD_WEBHOOK_SECRET
 * - PORTALD_API_URL (optional)
 */
function createPortaldClient() {
    const siteId = process.env.PORTALD_SITE_ID;
    const webhookSecret = process.env.PORTALD_WEBHOOK_SECRET;
    const baseUrl = process.env.PORTALD_API_URL;
    if (!siteId) {
        throw new Error('PORTALD_SITE_ID environment variable is required');
    }
    if (!webhookSecret) {
        throw new Error('PORTALD_WEBHOOK_SECRET environment variable is required');
    }
    return new PortaldClient({ siteId, webhookSecret, baseUrl });
}
