
import { Collection, Document } from '../types';
import { API_BASE_URL } from '../constants';

class ApiService {
  /**
   * Helper to perform fetch requests to the PHP backend.
   * Handles both GET and POST depending on if a body is provided.
   * Includes a timestamp to bypass any caching layers.
   */
  private async request(action: string, collection: string = '', body: any = null) {
    const url = new URL(`${API_BASE_URL}/api.php`);
    url.searchParams.append('action', action);
    
    if (collection) {
      url.searchParams.append('collection', collection);
    }

    url.searchParams.append('_t', Date.now().toString());

    const options: RequestInit = {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), options);
      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON Response received:", responseText);
        throw new Error(`Invalid server response (500 or Syntax Error). Check console for raw output.`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Request failed with status ${response.status}`);
      }

      return result;
    } catch (err) {
      console.error(`API Request failed for action "${action}":`, err);
      throw err;
    }
  }

  // Uploads a file to the remote server
  async uploadFile(file: File): Promise<{url: string, filename: string, mime: string, size: number}> {
    const url = new URL(`${API_BASE_URL}/api.php`);
    url.searchParams.append('action', 'upload');
    url.searchParams.append('_t', Date.now().toString());

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Upload Error Raw Response:", responseText);
        throw new Error("Upload failed: Server returned non-JSON response.");
      }

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result;
    } catch (err) {
      console.error("Upload Request Error:", err);
      throw err;
    }
  }

  // Fetches list of collection names
  async listCollections(): Promise<string[]> {
    const res = await this.request('list');
    return res.data || [];
  }

  // Fetches all documents for a specific collection
  async getCollectionDocs(collection: string): Promise<Document[]> {
    const res = await this.request('find', collection, {});
    return res.data || [];
  }

  async createCollection(collection: string): Promise<void> {
    await this.request('create', collection);
  }

  async dropCollection(collection: string): Promise<void> {
    await this.request('drop', collection);
  }

  async find(collection: string, query: any): Promise<Document[]> {
    const res = await this.request('find', collection, query);
    return res.data || [];
  }

  async insert(collection: string, document: any): Promise<Document> {
    const res = await this.request('insert', collection, document);
    return res.data;
  }

  async delete(collection: string, query: any): Promise<number> {
    const res = await this.request('delete', collection, query);
    return res.deleted || 0;
  }
}

export const apiService = new ApiService();
