import { pollUntilReady } from '../nodes/Emboss/poll';

const fakeCtx = (responses: any[]) => {
  let i = 0;
  return {
    getNode: () => ({ name: 'Emboss' }),
    helpers: { httpRequestWithAuthentication: { call: async () => responses[i++] } },
  } as any;
};

describe('pollUntilReady', () => {
  it('returns the payload once status is ready', async () => {
    const ctx = fakeCtx([{ status: 'processing' }, { status: 'ready', session_id: 's1' }]);
    const out = await pollUntilReady(ctx, 'https://api.getemboss.ai/x', { intervalMs: 0, maxAttempts: 5 });
    expect(out.session_id).toBe('s1');
  });
  it('throws with the Emboss error on failed (object shape)', async () => {
    const ctx = fakeCtx([{ status: 'failed', error: { code: 'bad_pdf', message: 'nope' } }]);
    await expect(pollUntilReady(ctx, 'https://api.getemboss.ai/x', { intervalMs: 0, maxAttempts: 5 }))
      .rejects.toThrow(/nope/);
  });
  it('throws with the Emboss error on failed (string shape)', async () => {
    const ctx = fakeCtx([{ status: 'failed', error: 'broken pdf' }]);
    await expect(pollUntilReady(ctx, 'https://api.getemboss.ai/x', { intervalMs: 0, maxAttempts: 5 }))
      .rejects.toThrow(/broken pdf/);
  });
  it('throws a timeout after maxAttempts', async () => {
    const ctx = fakeCtx(Array(10).fill({ status: 'processing' }));
    await expect(pollUntilReady(ctx, 'https://api.getemboss.ai/x', { intervalMs: 0, maxAttempts: 3 }))
      .rejects.toThrow(/didn't finish/i);
  });
});
