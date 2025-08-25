import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentsRouter, { paymentsWebhookHandler } from './routes/payments';

dotenv.config();

const app = express();

// NOTE: do NOT enable CORS globally because the /api/payments/webhook route must
// receive raw body and should not be affected by preflight/CORS middleware.
// We'll apply CORS only to the mounted payments router below (not to the webhook route).

// Mount webhook route with raw body parser BEFORE the JSON parser so the
// Stripe SDK can verify signatures against the original request body.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }) as any, paymentsWebhookHandler as any);

// Parse JSON for other routes
app.use(express.json());

// Return a clearer error when JSON parsing fails (rather than generic HTML 400)
app.use((err: any, _req: Request, res: Response, next: Function) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid_json', message: err.message });
  }
  // Some environments set a SyntaxError without type
  if (err instanceof SyntaxError && (err as any).status === 400) {
    return res.status(400).json({ error: 'invalid_json', message: err.message });
  }
  return next(err);
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use('/api/payments', paymentsRouter);

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}

export default app;
