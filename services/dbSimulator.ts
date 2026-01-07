
import { DatabaseState, Collection, Document } from '../types';

const STORAGE_KEY = 'php_nosql_sim_db';

export class DbSimulator {
  private state: DatabaseState;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.state = saved ? JSON.parse(saved) : { collections: [] };
    
    // Seed data if empty
    if (this.state.collections.length === 0) {
      this.createCollection('users');
      this.insert('users', { name: 'John Doe', email: 'john@example.com', age: 30, role: 'admin' });
      this.insert('users', { name: 'Jane Smith', email: 'jane@example.com', age: 25, role: 'user' });
      this.createCollection('products');
      this.insert('products', { name: 'Laptop', price: 1200, stock: 15 });
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getCollections(): Collection[] {
    return this.state.collections;
  }

  createCollection(name: string): void {
    if (this.state.collections.find(c => c.name === name)) return;
    this.state.collections.push({
      name,
      documents: [],
      createdAt: Date.now()
    });
    this.save();
  }

  deleteCollection(name: string): void {
    this.state.collections = this.state.collections.filter(c => c.name !== name);
    this.save();
  }

  insert(collectionName: string, doc: any): Document {
    const coll = this.state.collections.find(c => c.name === collectionName);
    if (!coll) throw new Error('Collection not found');

    const newDoc: Document = {
      ...doc,
      _id: `doc_${Math.random().toString(36).substr(2, 9)}`
    };
    coll.documents.push(newDoc);
    this.save();
    return newDoc;
  }

  find(collectionName: string, query: any = {}): Document[] {
    const coll = this.state.collections.find(c => c.name === collectionName);
    if (!coll) return [];
    if (Object.keys(query).length === 0) return coll.documents;

    return coll.documents.filter(doc => this.match(doc, query));
  }

  private match(doc: Document, query: any): boolean {
    for (const key in query) {
      const criteria = query[key];
      const val = doc[key];

      if (typeof criteria === 'object' && criteria !== null && !Array.isArray(criteria)) {
        for (const op in criteria) {
          const expected = criteria[op];
          switch (op) {
            case '$eq': if (val !== expected) return false; break;
            case '$ne': if (val === expected) return false; break;
            case '$gt': if (val <= expected) return false; break;
            case '$lt': if (val >= expected) return false; break;
            case '$regex': if (!new RegExp(expected, 'i').test(String(val))) return false; break;
            case '$in': if (!Array.isArray(expected) || !expected.includes(val)) return false; break;
          }
        }
      } else {
        if (val !== criteria) return false;
      }
    }
    return true;
  }

  delete(collectionName: string, query: any): number {
    const coll = this.state.collections.find(c => c.name === collectionName);
    if (!coll) return 0;

    const initialCount = coll.documents.length;
    coll.documents = coll.documents.filter(doc => !this.match(doc, query));
    this.save();
    return initialCount - coll.documents.length;
  }
}

export const db = new DbSimulator();
