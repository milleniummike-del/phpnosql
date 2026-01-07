
export interface Document {
  _id: string;
  [key: string]: any;
}

export interface Collection {
  name: string;
  documents: Document[];
  createdAt: number;
}

export interface DatabaseState {
  collections: Collection[];
}

export type ViewType = 'dashboard' | 'collections' | 'query' | 'source' | 'usage';

export interface QueryResult {
  data: any[];
  executionTime: number;
}
