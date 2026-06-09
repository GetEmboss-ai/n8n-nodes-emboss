import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeListSearchResult,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { pollUntilReady } from './poll';
import { contextParts, ContextFile } from './context';

const BASE = 'https://api.getemboss.ai';

export class Emboss implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Emboss',
    name: 'emboss',
    icon: 'file:emboss.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Create fillable PDFs and fill forms from context via Emboss',
    defaults: { name: 'Emboss' },
    inputs: ['main'] as any,
    outputs: ['main'] as any,
    credentials: [{ name: 'embossApi', required: true }],
    properties: [
      {
        displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
        options: [
          { name: 'Create Fillable Form', value: 'createForm', description: 'Turn a flat PDF into a fillable form', action: 'Create a fillable form' },
          { name: 'Fill From PDF + Context', value: 'fillFromPdf', description: 'Upload a PDF and context; get the filled PDF', action: 'Fill a form from a PDF and context' },
          { name: 'Fill Existing Form', value: 'fillExisting', description: 'Fill a form already created in Emboss', action: 'Fill an existing form' },
        ],
        default: 'createForm',
      },
      {
        displayName: 'Input PDF Field', name: 'binaryProperty', type: 'string', default: 'data',
        required: true, displayOptions: { show: { operation: ['createForm', 'fillFromPdf'] } },
        description: 'Name of the binary property holding the input PDF',
      },
      {
        displayName: 'Form', name: 'formId', type: 'resourceLocator', default: { mode: 'list', value: '' },
        required: true, displayOptions: { show: { operation: ['fillExisting'] } },
        modes: [
          { displayName: 'From List', name: 'list', type: 'list', typeOptions: { searchListMethod: 'getForms', searchable: true } },
          { displayName: 'By ID', name: 'id', type: 'string', placeholder: 'form-uuid' },
        ],
      },
      {
        displayName: 'Context (Text)', name: 'contextText', type: 'string', default: '',
        typeOptions: { rows: 3 }, displayOptions: { show: { operation: ['fillFromPdf', 'fillExisting'] } },
        description: 'Information to fill the form with',
      },
      {
        displayName: 'Context File Field', name: 'contextBinary', type: 'string', default: '',
        displayOptions: { show: { operation: ['fillFromPdf', 'fillExisting'] } },
        description: 'Optional: name of a binary property holding a context document (PDF, DOCX, CSV, image, text)',
      },
    ],
  };

  methods = {
    listSearch: {
      async getForms(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
        const resp = await this.helpers.httpRequestWithAuthentication.call(this, 'embossApi', { url: `${BASE}/forms` });
        const forms = (resp && resp.forms) || [];
        return { results: forms.map((f: any) => ({ name: f.title || f.id, value: f.id })) };
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        let resultUrl = '';
        let json: any = {};

        const readContextFile = async (): Promise<ContextFile | undefined> => {
          const cprop = this.getNodeParameter('contextBinary', i, '') as string;
          if (!cprop) return undefined;
          const meta = items[i].binary?.[cprop];
          const cbuf = await this.helpers.getBinaryDataBuffer(i, cprop);
          return { buffer: cbuf, filename: meta?.fileName || 'context', mimeType: meta?.mimeType || 'application/octet-stream' };
        };

        if (operation === 'createForm') {
          const prop = this.getNodeParameter('binaryProperty', i) as string;
          const buf = await this.helpers.getBinaryDataBuffer(i, prop);
          const form = new FormData();
          form.append('file', new Blob([buf as any], { type: 'application/pdf' }), 'form.pdf');
          const created = await this.helpers.httpRequestWithAuthentication.call(this, 'embossApi',
            { method: 'POST', url: `${BASE}/forms`, body: form });
          const formId = created.form_id;
          await pollUntilReady(this, `${BASE}/forms/${formId}`);
          resultUrl = `${BASE}/forms/${formId}/fillable`;
          json = { form_id: formId, status: 'ready' };
        } else if (operation === 'fillFromPdf') {
          const prop = this.getNodeParameter('binaryProperty', i) as string;
          const fileBuf = await this.helpers.getBinaryDataBuffer(i, prop);
          const text = this.getNodeParameter('contextText', i, '') as string;
          const cf = await readContextFile();
          const form = new FormData();
          form.append('file', new Blob([fileBuf as any], { type: 'application/pdf' }), 'form.pdf');
          for (const p of contextParts(text, cf)) {
            form.append('context', new Blob([p.value as any], { type: p.contentType }), p.filename);
          }
          const created = await this.helpers.httpRequestWithAuthentication.call(this, 'embossApi',
            { method: 'POST', url: `${BASE}/forms/with-context`, body: form });
          const ready = await pollUntilReady(this, `${BASE}/forms/with-context/${created.job_id}`);
          resultUrl = `${BASE}/sessions/${ready.session_id}/pdf`;
          json = { session_id: ready.session_id, report: ready.report || {} };
        } else if (operation === 'fillExisting') {
          const formId = (this.getNodeParameter('formId', i) as any).value as string;
          const text = this.getNodeParameter('contextText', i, '') as string;
          const cf = await readContextFile();
          const form = new FormData();
          for (const p of contextParts(text, cf)) {
            form.append('context', new Blob([p.value as any], { type: p.contentType }), p.filename);
          }
          const created = await this.helpers.httpRequestWithAuthentication.call(this, 'embossApi',
            { method: 'POST', url: `${BASE}/forms/${formId}/with-context`, body: form });
          const ready = await pollUntilReady(this, `${BASE}/forms/with-context/${created.job_id}`);
          resultUrl = `${BASE}/sessions/${ready.session_id}/pdf`;
          json = { session_id: ready.session_id, report: ready.report || {} };
        } else {
          throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
        }

        const pdf = await this.helpers.httpRequestWithAuthentication.call(this, 'embossApi',
          { url: resultUrl, encoding: 'arraybuffer' });
        const binary = await this.helpers.prepareBinaryData(Buffer.from(pdf), 'emboss.pdf', 'application/pdf');
        out.push({ json, binary: { data: binary }, pairedItem: { item: i } });
      } catch (err) {
        if (this.continueOnFail()) { out.push({ json: { error: (err as Error).message }, pairedItem: { item: i } }); continue; }
        throw err;
      }
    }
    return [out];
  }
}
