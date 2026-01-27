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

  // Fetch all items with pagination (Webflow returns max 100 per page)
  async getAllItems(collectionId) {
    const allItems = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const items = await this.getItems(collectionId, { limit, offset });
      allItems.push(...items);
      if (items.length < limit) break;
      offset += limit;
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return allItems;
  }

  async getItem(collectionId, itemId) {
    return this.request(`/collections/${collectionId}/items/${itemId}`);
  }

  async createItem(collectionId, itemData, isDraft = false) {
    return this.request(`/collections/${collectionId}/items${isDraft ? '' : '/live'}`, {
      method: 'POST',
      body: JSON.stringify({ fieldData: itemData }),
    });
  }

  async updateItem(collectionId, itemId, itemData, isLive = true) {
    return this.request(`/collections/${collectionId}/items/${itemId}${isLive ? '/live' : ''}`, {
      method: 'PATCH',
      body: JSON.stringify({ fieldData: itemData }),
    });
  }

  async deleteItem(collectionId, itemId) {
    return this.request(`/collections/${collectionId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Bulk operations
  async createItems(collectionId, items, isLive = true) {
    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await this.createItem(collectionId, items[i], !isLive);
        results.push({ success: true, index: i, data: result, action: 'created' });

        // Small delay to avoid rate limiting
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (error) {
        errors.push({ success: false, index: i, error: error.message, item: items[i] });
      }
    }

    return { results, errors, total: items.length };
  }

  // Upsert: update existing items by ID or slug, create new ones
  async upsertItems(collectionId, items, isLive = true, onProgress = null) {
    const results = [];
    const errors = [];

    // Fetch all existing items to build lookup maps
    if (onProgress) onProgress({ phase: 'fetching', message: 'Fetching existing items...' });
    const existingItems = await this.getAllItems(collectionId);
    const slugToId = {};
    const idSet = new Set();
    for (const item of existingItems) {
      if (item.fieldData?.slug) {
        slugToId[item.fieldData.slug] = item.id;
      }
      idSet.add(item.id);
    }

    if (onProgress) onProgress({ phase: 'importing', message: `Found ${existingItems.length} existing items. Starting upsert...` });

    // Build diagnostic info for debugging
    const _debug = {
      existingCount: existingItems.length,
      existingIds: existingItems.slice(0, 5).map(i => i.id),
      existingSlugs: existingItems.slice(0, 5).map(i => i.fieldData?.slug),
      incomingIds: items.slice(0, 5).map(i => i.id).filter(Boolean),
      incomingSlugs: items.slice(0, 5).map(i => i.slug).filter(Boolean),
    };

    for (let i = 0; i < items.length; i++) {
      try {
        // Extract id from the item data (not a CMS field, it's the item identifier)
        const { id: itemId, ...fieldData } = items[i];

        // Determine the existing item ID to update
        let existingId = null;
        if (itemId && idSet.has(itemId)) {
          existingId = itemId;
        } else if (fieldData.slug && slugToId[fieldData.slug]) {
          existingId = slugToId[fieldData.slug];
        }

        let result;
        let action;
        if (existingId) {
          // Update existing item
          result = await this.updateItem(collectionId, existingId, fieldData, isLive);
          action = 'updated';
        } else {
          // Create new item
          result = await this.createItem(collectionId, fieldData, !isLive);
          action = 'created';
        }

        results.push({ success: true, index: i, data: result, action });

        if (onProgress) onProgress({ phase: 'importing', message: `Processed ${i + 1} of ${items.length}`, current: i + 1, total: items.length });

        // Rate limit delay
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        errors.push({ success: false, index: i, error: error.message, item: items[i] });
      }
    }

    const updated = results.filter(r => r.action === 'updated').length;
    const created = results.filter(r => r.action === 'created').length;

    return { results, errors, total: items.length, updated, created, _debug };
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
