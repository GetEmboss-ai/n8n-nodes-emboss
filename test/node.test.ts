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
