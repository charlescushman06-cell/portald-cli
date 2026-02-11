"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPortaldClient = exports.PortaldClient = exports.computeSignature = exports.signRequest = void 0;
var signing_js_1 = require("./signing.js");
Object.defineProperty(exports, "signRequest", { enumerable: true, get: function () { return signing_js_1.signRequest; } });
Object.defineProperty(exports, "computeSignature", { enumerable: true, get: function () { return signing_js_1.computeSignature; } });
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "PortaldClient", { enumerable: true, get: function () { return client_js_1.PortaldClient; } });
Object.defineProperty(exports, "createPortaldClient", { enumerable: true, get: function () { return client_js_1.createPortaldClient; } });
