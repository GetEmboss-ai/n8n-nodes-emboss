import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeListSearchResult,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

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
    return [[]]; // per-operation bodies added in Tasks 6-7
  }
}
