import type { Express, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export type GeminiProxyRequestBody = {
  model?: string;
  contents: unknown;
  config?: Record<string, unknown>;
};

/**
 * Proxies Gemini generateContent calls. API key stays in server env only.
 */
export function registerGeminiRoute(app: Express): void {
  app.post('/api/gemini', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server' });
      return;
    }

    const body = req.body as GeminiProxyRequestBody;
    if (body?.contents === undefined || body?.contents === null) {
      res.status(400).json({ error: 'Request body must include contents' });
      return;
    }

    const model =
      typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'gemini-2.5-flash';

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: body.contents,
        ...(body.config ?? {})
      } as Parameters<typeof ai.models.generateContent>[0]);

      res.json({
        text: response.text ?? null,
        candidates: response.candidates ?? null,
        usageMetadata: response.usageMetadata ?? null
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      console.error('[api/gemini]', message);
      res.status(502).json({ error: message });
    }
  });
}
