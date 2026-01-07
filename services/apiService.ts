
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

    // Add a cache buster timestamp to ensure we get fresh data from the remote server
    // This is crucial for reflecting deletions and updates immediately.
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
      
      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          // ignore parsing error if response is not JSON
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API Request failed');
      }

      // Return the whole result object so callers can access specific fields (data, deleted, etc.)
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

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  }

  // Fetches list of collection names from the remote PHP server
  async listCollections(): Promise<string[]> {
    const res = await this.request('list');
    return res.data;
  }

  // Fetches all documents for a specific collection
  async getCollectionDocs(collection: string): Promise<Document[]> {
    // Calling 'find' with an empty object returns all documents in the JsonDB engine
    const res = await this.request('find', collection, {});
    return res.data;
  }

  // Creates a new empty collection on the remote server
  async createCollection(collection: string): Promise<void> {
    await this.request('create', collection);
  }

  // Drops (deletes) an entire collection from the remote server
  async dropCollection(collection: string): Promise<void> {
    await this.request('drop', collection);
  }

  // Finds documents matching a specific MongoDB-style query object
  async find(collection: string, query: any): Promise<Document[]> {
    const res = await this.request('find', collection, query);
    return res.data;
  }

  // Inserts a new document into a remote collection
  async insert(collection: string, document: any): Promise<Document> {
    const res = await this.request('insert', collection, document);
    return res.data;
  }

  // Deletes documents matching a specific query and returns the count of deleted items
  async delete(collection: string, query: any): Promise<number> {
    const res = await this.request('delete', collection, query);
    return res.deleted;
  }
}

// Export the singleton instance of ApiService
export const apiService = new ApiService();
