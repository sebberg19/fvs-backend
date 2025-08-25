"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const payments_1 = __importStar(require("./routes/payments"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Collector middleware: accumulate raw request bytes into req.rawBody.
// This runs before any body parser so we keep an untouched Buffer copy
// suitable for signature verification (Stripe requires the original bytes).
function collectRawBodyForWebhook(req, res, next) {
    try {
        const chunks = [];
        req.on('data', function (chunk) {
            chunks.push(chunk);
        });
        req.on('end', function () {
            try {
                req.rawBody = Buffer.concat(chunks);
            }
            catch (e) {
                // fallback to empty buffer on error
                req.rawBody = Buffer.from('');
            }
            next();
        });
        req.on('error', function (err) { next(err); });
    }
    catch (err) {
        next(err);
    }
}
// NOTE: do NOT enable CORS globally because the /api/payments/webhook route must
// receive raw body and should not be affected by preflight/CORS middleware.
// We'll apply CORS only to the mounted payments router below (not to the webhook route).
// Mount webhook route with raw body parser BEFORE the JSON parser so the
// Stripe SDK can verify signatures against the original request body.
// Accept raw body for the webhook route for all content-types to ensure the
// Stripe SDK receives the original Buffer (some proxies or charset headers can
// cause the body to be parsed early if the type matching is too strict).
// Mount the collector before the raw parser so we always capture the
// original bytes into req.rawBody even if a downstream parser modifies req.body.
app.post('/api/payments/webhook', collectRawBodyForWebhook, express_1.default.raw({ type: '*/*' }), payments_1.paymentsWebhookHandler);
// Parse JSON for other routes
app.use(express_1.default.json());
// Return a clearer error when JSON parsing fails (rather than generic HTML 400)
app.use((err, _req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'invalid_json', message: err.message });
    }
    // Some environments set a SyntaxError without type
    if (err instanceof SyntaxError && err.status === 400) {
        return res.status(400).json({ error: 'invalid_json', message: err.message });
    }
    return next(err);
});
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
});
app.use('/api/payments', payments_1.default);
const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}
exports.default = app;
