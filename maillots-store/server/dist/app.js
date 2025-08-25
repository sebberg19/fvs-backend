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
// CRITICAL: Use raw body parsing globally to prevent ANY automatic JSON parsing
// that would corrupt webhook signatures. We'll handle JSON parsing manually
// in routes that need it.
app.use(express_1.default.raw({ type: '*/*' }));
// Manual JSON parser middleware for non-webhook routes
const parseJsonForNonWebhook = (req, res, next) => {
    // Skip JSON parsing for webhook route - it needs raw bytes
    if (req.path === '/api/payments/webhook') {
        return next();
    }
    // For other routes, parse JSON manually if content-type indicates JSON
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json') && Buffer.isBuffer(req.body)) {
        try {
            const bodyStr = req.body.toString('utf8');
            req.body = JSON.parse(bodyStr);
        }
        catch (e) {
            return res.status(400).json({ error: 'invalid_json', message: 'Failed to parse JSON body' });
        }
    }
    next();
};
app.use(parseJsonForNonWebhook);
// Mount webhook route - it will receive raw Buffer directly
app.post('/api/payments/webhook', payments_1.paymentsWebhookHandler);
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
