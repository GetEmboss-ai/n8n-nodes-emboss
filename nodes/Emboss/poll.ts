import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export interface PollOpts {
  intervalMs?: number;
  maxAttempts?: number;
}

// Poll a status URL until the payload reports status 'ready'. Throws a clean NodeOperationError
// on status 'failed' (surfacing the Emboss error code/message) or after maxAttempts (~5 min default).
export async function pollUntilReady(
  ctx: IExecuteFunctions,
  url: string,
  opts: PollOpts = {},
): Promise<any> {
  const intervalMs = opts.intervalMs ?? 3000;
  const maxAttempts = opts.maxAttempts ?? 100; // 3s * 100 ≈ 5 min
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (intervalMs > 0) await new Promise((r) => setTimeout(r, intervalMs));
    const payload = await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'embossApi', { url });
    if (payload.status === 'failed') {
      const e = payload.error;
      const detail = typeof e === 'string' ? e : (e && (e.message || e.code)) || 'no detail';
      throw new NodeOperationError(ctx.getNode(), `Emboss fill failed: ${detail}`);
    }
    if (payload.status === 'ready') return payload;
  }
  throw new NodeOperationError(ctx.getNode(),
    "Emboss job didn't finish within ~5 minutes. Re-run, or check the Emboss dashboard.");
}
