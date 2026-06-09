import { EmbossApi } from '../credentials/EmbossApi.credentials';

describe('EmbossApi credential', () => {
  const cred = new EmbossApi();
  it('declares an apiKey password field', () => {
    const f = cred.properties.find((p) => p.name === 'apiKey');
    expect(f).toBeTruthy();
    expect(f!.typeOptions?.password).toBe(true);
  });
  it('injects a Bearer auth header', () => {
    expect((cred.authenticate as any).properties.headers.Authorization)
      .toBe('=Bearer {{$credentials.apiKey}}');
  });
  it('tests against GET /forms', () => {
    expect((cred.test as any).request.url).toBe('/forms');
    expect((cred.test as any).request.baseURL).toBe('https://api.getemboss.ai');
  });
});
