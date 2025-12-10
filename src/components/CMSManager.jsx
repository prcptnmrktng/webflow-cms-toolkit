import { useState, useEffect } from 'react';
import { 
  Database, ChevronRight, Plus, Trash2, Edit2, Save, X, 
  Loader2, RefreshCw, Eye, FileJson, Download, AlertCircle,
  Type, Image, Hash, Calendar, ToggleLeft, Link, List, File
} from 'lucide-react';
import { FIELD_TYPES } from '../utils/webflow';

const FIELD_ICONS = {
  'PlainText': Type,
  'RichText': FileJson,
  'Image': Image,
  'MultiImage': Image,
  'Number': Hash,
  'DateTime': Calendar,
  'Switch': ToggleLeft,
  'Link': Link,
  'Option': List,
  'File': File,
  'Reference': Link,
  'MultiReference': Link,
};

function CMSManager({ client, site, collections, setCollections, isConnected }) {
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionDetails, setCollectionDetails] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [newField, setNewField] = useState(null);

  // Load collection details and items
  const loadCollection = async (collection) => {
    setSelectedCollection(collection);
    setIsLoading(true);
    setError(null);

    try {
      const details = await client.getCollection(collection.id);
      setCollectionDetails(details);

      setIsLoadingItems(true);
      const itemsData = await client.getItems(collection.id, { limit: 100 });
      setItems(itemsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsLoadingItems(false);
    }
  };

  // Refresh collections list
  const refreshCollections = async () => {
    if (!client || !site) return;
    setIsLoading(true);
    try {
      const data = await client.getCollections(site.id);
      setCollections(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export collection schema
  const exportSchema = () => {
    if (!collectionDetails) return;
    const schema = {
      name: collectionDetails.displayName || collectionDetails.name,
      slug: collectionDetails.slug,
      fields: collectionDetails.fields?.map(f => ({
        name: f.displayName || f.name,
        slug: f.slug,
        type: f.type,
        required: f.isRequired,
        helpText: f.helpText,
      })),
    };
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collectionDetails.slug}-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export items as JSON
  const exportItems = () => {
    if (!items.length) return;
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCollection.slug}-items.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add new field
  const handleAddField = async () => {
    if (!newField || !newField.name || !newField.type) return;
    
    setIsLoading(true);
    try {
      await client.createField(selectedCollection.id, {
        displayName: newField.name,
        type: newField.type,
        isRequired: newField.required || false,
        helpText: newField.helpText || '',
      });
      
      // Reload collection
      await loadCollection(selectedCollection);
      setNewField(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete field
  const handleDeleteField = async (fieldId) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    
    setIsLoading(true);
    try {
      await client.deleteField(selectedCollection.id, fieldId);
      await loadCollection(selectedCollection);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <Database className="w-12 h-12 text-pm-border mx-auto mb-4" />
        <h2 className="text-xl text-pm-text-muted mb-2">Connect to Webflow</h2>
        <p className="text-pm-text-muted/60 text-sm">Enter your API token above to manage CMS collections</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="section-label">CMS Manager</span>
          <h2 className="text-2xl text-pm-text mt-2">Collections</h2>
        </div>
        <button onClick={refreshCollections} className="btn btn-secondary" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-pm-error/10 border border-pm-error/30 flex items-center gap-3 text-pm-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Collections List */}
        <div className="col-span-4">
          <div className="card">
            <h3 className="text-xs uppercase tracking-widest text-pm-accent mb-4">Collections ({collections.length})</h3>
            <div className="space-y-1">
              {collections.map(collection => (
                <button
                  key={collection.id}
                  onClick={() => loadCollection(collection)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between group transition-colors ${
                    selectedCollection?.id === collection.id 
                      ? 'bg-pm-accent/10 text-pm-accent border-l-2 border-pm-accent' 
                      : 'hover:bg-pm-gray-light text-pm-text-muted hover:text-pm-text'
                  }`}
                >
                  <span className="text-sm">{collection.displayName || collection.name}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {collections.length === 0 && (
                <p className="text-pm-text-muted/60 text-sm text-center py-4">No collections found</p>
              )}
            </div>
          </div>
        </div>

        {/* Collection Details */}
        <div className="col-span-8">
          {selectedCollection ? (
            <div className="space-y-6">
              {/* Collection Header */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl text-pm-text">{collectionDetails?.displayName || selectedCollection.name}</h3>
                    <p className="text-pm-text-muted text-sm mt-1">/{collectionDetails?.slug || selectedCollection.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={exportSchema} className="btn btn-secondary text-xs">
                      <Download className="w-3 h-3" />
                      Schema
                    </button>
                    <button onClick={exportItems} className="btn btn-secondary text-xs" disabled={!items.length}>
                      <Download className="w-3 h-3" />
                      Items ({items.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs uppercase tracking-widest text-pm-accent">
                    Fields ({collectionDetails?.fields?.length || 0})
                  </h4>
                  <button 
                    onClick={() => setNewField({ name: '', type: 'PlainText', required: false })}
                    className="btn btn-ghost text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add Field
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-pm-accent" />
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Field Name</th>
                        <th>Slug</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* New field row */}
                      {newField && (
                        <tr className="bg-pm-accent/5">
                          <td>
                            <input
                              type="text"
                              value={newField.name}
                              onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                              placeholder="Field name"
                              className="w-full text-sm py-1"
                              autoFocus
                            />
                          </td>
                          <td className="text-pm-text-muted/50">Auto-generated</td>
                          <td>
                            <select
                              value={newField.type}
                              onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                              className="text-sm py-1"
                            >
                              {Object.entries(FIELD_TYPES).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={newField.required}
                              onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                              className="accent-pm-accent"
                            />
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button onClick={handleAddField} className="p-1 text-pm-success hover:bg-pm-success/20">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => setNewField(null)} className="p-1 text-pm-error hover:bg-pm-error/20">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Existing fields */}
                      {collectionDetails?.fields?.map(field => {
                        const IconComponent = FIELD_ICONS[field.type] || Type;
                        return (
                          <tr key={field.id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4 text-pm-accent/60" />
                                <span className="text-pm-text">{field.displayName || field.name}</span>
                              </div>
                            </td>
                            <td className="font-mono text-xs">{field.slug}</td>
                            <td>
                              <span className="badge badge-info">{FIELD_TYPES[field.type]?.label || field.type}</span>
                            </td>
                            <td>
                              {field.isRequired && <span className="text-pm-accent">●</span>}
                            </td>
                            <td>
                              {!field.isEditable === false && (
                                <button 
                                  onClick={() => handleDeleteField(field.id)}
                                  className="p-1 text-pm-text-muted hover:text-pm-error hover:bg-pm-error/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Items Preview */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs uppercase tracking-widest text-pm-accent">
                    Items Preview
                  </h4>
                  {isLoadingItems && <Loader2 className="w-4 h-4 animate-spin text-pm-accent" />}
                </div>

                {items.length > 0 ? (
                  <div className="max-h-64 overflow-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Slug</th>
                          <th>Status</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.slice(0, 20).map(item => (
                          <tr key={item.id}>
                            <td className="text-pm-text">{item.fieldData?.name || item.fieldData?.title || 'Untitled'}</td>
                            <td className="font-mono text-xs">{item.fieldData?.slug}</td>
                            <td>
                              <span className={`badge ${item.isDraft ? 'badge-warning' : 'badge-success'}`}>
                                {item.isDraft ? 'Draft' : 'Published'}
                              </span>
                            </td>
                            <td className="text-xs">
                              {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {items.length > 20 && (
                      <p className="text-center text-pm-text-muted text-xs py-2">
                        Showing 20 of {items.length} items
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-pm-text-muted/60 text-sm text-center py-8">
                    {isLoadingItems ? 'Loading items...' : 'No items in this collection'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-16">
              <Database className="w-10 h-10 text-pm-border mx-auto mb-3" />
              <p className="text-pm-text-muted">Select a collection to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CMSManager;
