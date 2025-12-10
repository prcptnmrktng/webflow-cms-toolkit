// Webflow API v2 Client (via Netlify Functions proxy)

const PROXY_URL = '/.netlify/functions/webflow-proxy';

class WebflowClient {
  constructor(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint,
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body) : undefined,
        token: this.token,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `API Error: ${response.status}`);
    }

    return data;
  }

  // Sites
  async getSites() {
    const data = await this.request('/sites');
    return data.sites || [];
  }

  async getSite(siteId) {
    return this.request(`/sites/${siteId}`);
  }

  // Collections
  async getCollections(siteId) {
    const data = await this.request(`/sites/${siteId}/collections`);
    return data.collections || [];
  }

  async getCollection(collectionId) {
    return this.request(`/collections/${collectionId}`);
  }

  async getCollectionFields(collectionId) {
    const collection = await this.getCollection(collectionId);
    return collection.fields || [];
  }

  // Collection Fields
  async createField(collectionId, fieldData) {
    return this.request(`/collections/${collectionId}/fields`, {
      method: 'POST',
      body: JSON.stringify(fieldData),
    });
  }

  async updateField(collectionId, fieldId, fieldData) {
    return this.request(`/collections/${collectionId}/fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify(fieldData),
    });
  }

  async deleteField(collectionId, fieldId) {
    return this.request(`/collections/${collectionId}/fields/${fieldId}`, {
      method: 'DELETE',
    });
  }

  // Collection Items
  async getItems(collectionId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await this.request(`/collections/${collectionId}/items${query}`);
    return data.items || [];
  }

  async getItem(collectionId, itemId) {
    return this.request(`/collections/${collectionId}/items/${itemId}`);
  }

  async createItem(collectionId, itemData, isLive = true) {
    // Webflow API v2 uses query param for live publishing
    const endpoint = `/collections/${collectionId}/items${isLive ? '?live=true' : ''}`;
    
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ 
        isArchived: false,
        isDraft: false,
        fieldData: itemData 
      }),
    });
  }

  async updateItem(collectionId, itemId, itemData, isLive = true) {
    const endpoint = `/collections/${collectionId}/items/${itemId}${isLive ? '?live=true' : ''}`;
    
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ fieldData: itemData }),
    });
  }

  async deleteItem(collectionId, itemId) {
    return this.request(`/collections/${collectionId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Bulk operations with rate limiting
  async createItems(collectionId, items, isLive = true) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await this.createItem(collectionId, items[i], isLive);
        results.push({ success: true, index: i, data: result });
        
        // Webflow rate limit: ~60 requests/min, so 1100ms between requests
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      } catch (error) {
        errors.push({ success: false, index: i, error: error.message, item: items[i] });
        
        // If rate limited, wait longer and continue
        if (error.message.includes('Too Many Requests')) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    return { results, errors, total: items.length };
  }

  // Publish
  async publishSite(siteId, options = {}) {
    return this.request(`/sites/${siteId}/publish`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
}

// Helper to validate API token format
export function isValidToken(token) {
  return token && token.length > 20;
}

// Field type mappings for display
export const FIELD_TYPES = {
  'PlainText': { label: 'Plain Text', icon: 'Type' },
  'RichText': { label: 'Rich Text', icon: 'FileText' },
  'Image': { label: 'Image', icon: 'Image' },
  'MultiImage': { label: 'Multi-Image', icon: 'Images' },
  'Video': { label: 'Video', icon: 'Video' },
  'Link': { label: 'Link', icon: 'Link' },
  'Email': { label: 'Email', icon: 'Mail' },
  'Phone': { label: 'Phone', icon: 'Phone' },
  'Number': { label: 'Number', icon: 'Hash' },
  'DateTime': { label: 'Date/Time', icon: 'Calendar' },
  'Switch': { label: 'Switch', icon: 'ToggleLeft' },
  'Color': { label: 'Color', icon: 'Palette' },
  'Option': { label: 'Option', icon: 'List' },
  'File': { label: 'File', icon: 'File' },
  'Reference': { label: 'Reference', icon: 'Link2' },
  'MultiReference': { label: 'Multi-Reference', icon: 'Link2' },
};

export default WebflowClient;
