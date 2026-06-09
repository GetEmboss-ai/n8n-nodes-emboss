import { Emboss } from '../nodes/Emboss/Emboss.node';

describe('Emboss node description', () => {
  const node = new Emboss();
  it('declares the embossApi credential', () => {
    expect(node.description.credentials).toEqual([{ name: 'embossApi', required: true }]);
  });
  it('has the 3 operations', () => {
    const op = node.description.properties.find((p) => p.name === 'operation');
    const values = (op!.options as any[]).map((o) => o.value);
    expect(values).toEqual(['createForm', 'fillFromPdf', 'fillExisting']);
  });
  it('form_id is a resourceLocator with a list search', () => {
    const f = node.description.properties.find((p) => p.name === 'formId');
    expect(f!.type).toBe('resourceLocator');
  });
});

describe('getForms listSearch', () => {
  it('maps /forms to results with title->id fallback', async () => {
    const node = new Emboss();
    const ctx = {
      helpers: { httpRequestWithAuthentication: { call: async () => ({ forms: [
        { id: 'f1', title: 'Intake' }, { id: 'f2', title: null },
      ] }) } },
    } as any;
    const out = await node.methods.listSearch.getForms.call(ctx);
    expect(out.results).toEqual([
      { name: 'Intake', value: 'f1' },
      { name: 'f2', value: 'f2' },
    ]);
  });
});

describe('execute: createForm', () => {
  beforeAll(() => { jest.spyOn(global, 'setTimeout').mockImplementation(((fn: any) => { fn(); return 0 as any; }) as any); });
  afterAll(() => { (global.setTimeout as any).mockRestore?.(); });

  it('POSTs the file, polls, returns the fillable PDF as binary', async () => {
    const calls: any[] = [];
    const node = new Emboss();
    const ctx = {
      getInputData: () => [{ json: {}, binary: { data: {} } }],
      getNodeParameter: (n: string) => (n === 'operation' ? 'createForm' : 'data'),
      getNode: () => ({ name: 'Emboss' }),
      continueOnFail: () => false,
      helpers: {
        getBinaryDataBuffer: async () => Buffer.from('PDF'),
        prepareBinaryData: async (buf: Buffer) => ({ data: buf.toString('base64'), mimeType: 'application/pdf' }),
        httpRequestWithAuthentication: { call: async (_c: any, _cred: any, opts: any) => {
          calls.push(opts);
          if (opts.method === 'POST') return { form_id: 'F1', status: 'processing' };
          if (opts.url.endsWith('/fillable')) return Buffer.from('%PDF-FILLABLE');
          return { status: 'ready' }; // the poll
        } },
      },
    } as any;
    const out = await node.execute.call(ctx);
    expect(out[0][0].binary!.data).toBeTruthy();
    expect(out[0][0].json.form_id).toBe('F1');
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/forms'))).toBe(true);
    expect(calls.some((c) => c.url.endsWith('/forms/F1/fillable'))).toBe(true);
  });
});
