/**
 * Portald SDK - Client
 *
 * Server-side SDK for merchants to interact with Portald.
 * All requests are signed with HMAC to prove authenticity.
 */
export interface PortaldConfig {
    /** Your MerchantSite ID from Portald dashboard */
    siteId: string;
    /** Your webhook secret (keep this secure!) */
    webhookSecret: string;
    /** Portald API base URL (default: https://www.portald.ai/api) */
    baseUrl?: string;
}
export interface VerifyPaymentResult {
    verified: boolean;
    action?: {
        id: string;
        status: string;
        actionType: string;
        amountCents?: number;
        decidedAt?: string;
    };
    error?: string;
}
export interface WebhookPayload {
    event: 'action.decided';
    action_id: string;
    status: 'approved' | 'denied' | 'failed';
    action_type: string;
    decided_at: string;
    reason?: string;
    payment_intent_id?: string;
    payment_error?: string;
    amount_cents?: number;
}
/**
 * Portald SDK Client
 *
 * Use this in your backend to:
 * - Verify webhook signatures from Portald
 * - Verify that a payment was actually processed
 */
export declare class PortaldClient {
    private siteId;
    private webhookSecret;
    private baseUrl;
    constructor(config: PortaldConfig);
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
    verifyWebhookSignature(payload: string, timestamp: string, signature: string): boolean;
    /**
     * Verify that a payment was actually processed by Portald.
     *
     * Call this after receiving a webhook to double-check the payment
     * status directly with Portald. This prevents spoofed webhooks.
     *
     * @param actionId - The action_id from the webhook
     * @returns Verification result with action details
     */
    verifyPayment(actionId: string): Promise<VerifyPaymentResult>;
    /**
     * Create signed headers for a custom API request.
     *
     * Use this if you need to make custom API calls to Portald.
     *
     * @param body - Request body
     * @returns Headers to include in your request
     */
    createSignedHeaders(body: string | object): import("./signing.js").SignedHeaders;
}
/**
 * Create a Portald client from environment variables.
 *
 * Expects:
 * - PORTALD_SITE_ID
 * - PORTALD_WEBHOOK_SECRET
 * - PORTALD_API_URL (optional)
 */
export declare function createPortaldClient(): PortaldClient;
