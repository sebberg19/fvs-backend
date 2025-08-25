import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentsRouter, { paymentsWebhookHandler } from './routes/payments';

dotenv.config();

const app = express();

// CRITICAL: Use raw body parsing globally to prevent ANY automatic JSON parsing
// that would corrupt webhook signatures. We'll handle JSON parsing manually
// in routes that need it.
app.use(express.raw({ type: '*/*' }));

// Manual JSON parser middleware for non-webhook routes
const parseJsonForNonWebhook = (req: any, res: any, next: any) => {
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
    } catch (e) {
      return res.status(400).json({ error: 'invalid_json', message: 'Failed to parse JSON body' });
    }
  }
  next();
};

app.use(parseJsonForNonWebhook);

// Mount webhook route - it will receive raw Buffer directly
app.post('/api/payments/webhook', paymentsWebhookHandler as any);

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
