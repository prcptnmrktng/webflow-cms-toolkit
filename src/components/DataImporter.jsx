import { useState, useCallback } from 'react';
import { 
  Upload, FileJson, FileSpreadsheet, ChevronRight, Check, X, 
  AlertCircle, Loader2, Play, Eye, Download, ArrowRight, 
  RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import Papa from 'papaparse';

function DataImporter({ client, site, collections, isConnected }) {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionFields, setCollectionFields] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [upsertProgress, setUpsertProgress] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  // Handle file select
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // Process uploaded file
  const processFile = (uploadedFile) => {
    setError(null);
    setFile(uploadedFile);
    setImportResults(null);

    const extension = uploadedFile.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      setFileType('csv');
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsedData(results.data);
          setHeaders(results.meta.fields || []);
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
        },
      });
    } else if (extension === 'json') {
      setFileType('json');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const dataArray = Array.isArray(data) ? data : [data];
          setParsedData(dataArray);
          
          // Extract headers from first object
          if (dataArray.length > 0) {
            setHeaders(Object.keys(dataArray[0]));
          }
        } catch (err) {
          setError(`Failed to parse JSON: ${err.message}`);
        }
      };
      reader.readAsText(uploadedFile);
    } else {
      setError('Unsupported file type. Please upload a CSV or JSON file.');
      setFile(null);
    }
  };

  // Load collection fields when collection is selected
  const handleCollectionSelect = async (collectionId) => {
    const collection = collections.find(c => c.id === collectionId);
    setSelectedCollection(collection);
    
    if (client && collection) {
      try {
        const details = await client.getCollection(collection.id);
        setCollectionFields(details.fields || []);
        
        // Auto-map fields with matching names
        const autoMapping = {};
        headers.forEach(header => {
          const matchingField = details.fields?.find(
            f => f.slug.toLowerCase() === header.toLowerCase() ||
                 f.displayName?.toLowerCase() === header.toLowerCase()
          );
          if (matchingField) {
            autoMapping[header] = matchingField.slug;
          }
        });
        setFieldMapping(autoMapping);
      } catch (err) {
        setError(`Failed to load collection: ${err.message}`);
      }
    }
  };

  // Update field mapping
  const updateMapping = (sourceField, targetField) => {
    setFieldMapping(prev => ({
      ...prev,
      [sourceField]: targetField,
    }));
  };

  // Transform data based on mapping
  const transformData = () => {
    return parsedData.map(row => {
      const transformed = {};
      // Preserve id for upsert mode (used to match existing items)
      if (isUpdateMode && row.id) {
        transformed.id = row.id;
      }
      Object.entries(fieldMapping).forEach(([source, target]) => {
        if (target && row[source] !== undefined) {
          transformed[target] = row[source];
        }
      });
      return transformed;
    });
  };

  // Run import (dryRunOverride lets the "Run Live" button bypass stale closure)
  const runImport = async (dryRunOverride) => {
    if (!selectedCollection || !parsedData?.length) return;

    const dryRun = dryRunOverride !== undefined ? dryRunOverride : isDryRun;

    setIsImporting(true);
    setError(null);
    setUpsertProgress(null);

    try {
      const transformedData = transformData();

      if (dryRun) {
        // Dry run - just show what would be imported
        const itemsWithId = transformedData.filter(d => d.id).length;
        const itemsWithSlug = transformedData.filter(d => d.slug && !d.id).length;
        const itemsNew = transformedData.length - itemsWithId - itemsWithSlug;
        setImportResults({
          mode: 'dry-run',
          total: transformedData.length,
          preview: transformedData.slice(0, 5),
          success: transformedData.length,
          errors: [],
          isUpdateMode,
          itemsWithId,
          itemsWithSlug,
          itemsNew,
        });
      } else if (isUpdateMode) {
        // Upsert import - update existing, create new
        const result = await client.upsertItems(
          selectedCollection.id,
          transformedData,
          true,
          (progress) => setUpsertProgress(progress)
        );
        setImportResults({
          mode: 'live',
          total: result.total,
          success: result.results.length,
          errors: result.errors,
          preview: result.results.slice(0, 5).map(r => r.data),
          updated: result.updated,
          created: result.created,
          isUpdateMode: true,
          _debug: result._debug,
        });
      } else {
        // Create-only import
        const result = await client.createItems(selectedCollection.id, transformedData, true);
        setImportResults({
          mode: 'live',
          total: result.total,
          success: result.results.length,
          errors: result.errors,
          preview: result.results.slice(0, 5).map(r => r.data),
          isUpdateMode: false,
        });
      }
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
      setUpsertProgress(null);
    }
  };

  // Reset importer
  const reset = () => {
    setFile(null);
    setFileType(null);
    setParsedData(null);
    setHeaders([]);
    setSelectedCollection(null);
    setCollectionFields([]);
    setFieldMapping({});
    setImportResults(null);
    setIsUpdateMode(false);
    setUpsertProgress(null);
    setError(null);
  };

  // Download template CSV
  const downloadTemplate = () => {
    if (!collectionFields.length) return;
    
    const headers = collectionFields
      .filter(f => !['_archived', '_draft'].includes(f.slug))
      .map(f => f.slug);
    
    const csv = Papa.unparse({
      fields: headers,
      data: [headers.map(() => '')], // Empty row as example
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCollection.slug}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <Upload className="w-12 h-12 text-pm-border mx-auto mb-4" />
        <h2 className="text-xl text-pm-text-muted mb-2">Connect to Webflow</h2>
        <p className="text-pm-text-muted/60 text-sm">Enter your API token to import data</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <span className="section-label">Data Import</span>
        <h2 className="text-2xl text-pm-text mt-2">Bulk Upload</h2>
        <p className="text-pm-text-muted text-sm mt-1">Import CSV or JSON data into Webflow CMS collections</p>
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

      {/* Step 1: Upload File */}
      {!parsedData && (
        <div 
          className={`drop-zone corner-bracket ${dragActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border border-pm-border flex items-center justify-center">
              <Upload className="w-8 h-8 text-pm-accent" />
            </div>
            <div>
              <p className="text-pm-text mb-1">Drop your file here or click to browse</p>
              <p className="text-pm-text-muted text-sm">Supports CSV and JSON files</p>
            </div>
            <div className="flex gap-4 text-pm-text-muted text-xs">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </span>
              <span className="flex items-center gap-1">
                <FileJson className="w-4 h-4" /> JSON
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Map Fields */}
      {parsedData && !importResults && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {fileType === 'csv' ? (
                  <FileSpreadsheet className="w-8 h-8 text-pm-accent" />
                ) : (
                  <FileJson className="w-8 h-8 text-pm-accent" />
                )}
                <div>
                  <p className="text-pm-text">{file?.name}</p>
                  <p className="text-pm-text-muted text-sm">{parsedData.length} rows • {headers.length} columns</p>
                </div>
              </div>
              <button onClick={reset} className="btn btn-ghost text-xs">
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Collection Selection */}
          <div className="card">
            <h3 className="text-xs uppercase tracking-widest text-pm-accent mb-4">Target Collection</h3>
            <div className="flex gap-4">
              <select
                value={selectedCollection?.id || ''}
                onChange={(e) => handleCollectionSelect(e.target.value)}
                className="flex-1"
              >
                <option value="">Select a collection...</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.displayName || c.name}</option>
                ))}
              </select>
              {selectedCollection && (
                <button onClick={downloadTemplate} className="btn btn-secondary text-xs">
                  <Download className="w-4 h-4" />
                  Template
                </button>
              )}
            </div>
          </div>

          {/* Import Mode */}
          {selectedCollection && (
            <div className="card">
              <h3 className="text-xs uppercase tracking-widest text-pm-accent mb-4">Import Mode</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsUpdateMode(false)}
                  className={`flex-1 p-4 border text-left ${!isUpdateMode ? 'border-pm-accent bg-pm-accent/10' : 'border-pm-border hover:border-pm-border/60'}`}
                >
                  <p className="text-pm-text font-medium mb-1">Create New</p>
                  <p className="text-pm-text-muted text-xs">Create new CMS items (may create duplicates)</p>
                </button>
                <button
                  onClick={() => setIsUpdateMode(true)}
                  className={`flex-1 p-4 border text-left ${isUpdateMode ? 'border-pm-accent bg-pm-accent/10' : 'border-pm-border hover:border-pm-border/60'}`}
                >
                  <p className="text-pm-text font-medium mb-1">Update Existing</p>
                  <p className="text-pm-text-muted text-xs">Match by ID or slug — update existing, create only if new</p>
                </button>
              </div>
              {isUpdateMode && (
                <p className="text-pm-text-muted text-xs mt-3">
                  Items with an "id" field will be matched by ID. Items without "id" will be matched by slug. Unmatched items will be created as new.
                </p>
              )}
            </div>
          )}

          {/* Field Mapping */}
          {selectedCollection && collectionFields.length > 0 && (
            <div className="card">
              <h3 className="text-xs uppercase tracking-widest text-pm-accent mb-4">Field Mapping</h3>
              <div className="space-y-3">
                {headers.map(header => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <span className="text-pm-text text-sm font-mono">{header}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-pm-border" />
                    <select
                      value={fieldMapping[header] || ''}
                      onChange={(e) => updateMapping(header, e.target.value)}
                      className="flex-1"
                    >
                      <option value="">Skip this field</option>
                      {collectionFields
                        .filter(f => !['_archived', '_draft'].includes(f.slug))
                        .map(f => (
                          <option key={f.id} value={f.slug}>
                            {f.displayName || f.name} ({f.type})
                          </option>
                        ))
                      }
                    </select>
                    {fieldMapping[header] && (
                      <Check className="w-4 h-4 text-pm-success" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-pm-border">
                <p className="text-pm-text-muted text-sm mb-4">
                  {Object.values(fieldMapping).filter(Boolean).length} of {headers.length} fields mapped
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      className="accent-pm-accent"
                    />
                    <span className="text-sm text-pm-text-muted">Dry run (preview only)</span>
                  </label>
                  <button
                    onClick={runImport}
                    disabled={isImporting || Object.values(fieldMapping).filter(Boolean).length === 0}
                    className="btn btn-primary ml-auto"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isDryRun ? 'Previewing...' : (upsertProgress ? upsertProgress.message : 'Importing...')}
                      </>
                    ) : (
                      <>
                        {isDryRun ? <Eye className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isDryRun ? 'Preview Import' : (isUpdateMode ? 'Run Upsert' : 'Run Import')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Preview */}
          <div className="card">
            <h3 className="text-xs uppercase tracking-widest text-pm-accent mb-4">Data Preview</h3>
            <div className="overflow-auto max-h-64">
              <table>
                <thead>
                  <tr>
                    {headers.slice(0, 6).map(h => (
                      <th key={h}>{h}</th>
                    ))}
                    {headers.length > 6 && <th>...</th>}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {headers.slice(0, 6).map(h => (
                        <td key={h} className="max-w-xs truncate">{row[h]}</td>
                      ))}
                      {headers.length > 6 && <td>...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 5 && (
              <p className="text-pm-text-muted text-xs mt-2 text-center">
                Showing 5 of {parsedData.length} rows
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {importResults && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              {importResults.mode === 'dry-run' ? (
                <Eye className="w-10 h-10 text-pm-blue" />
              ) : importResults.errors.length === 0 ? (
                <CheckCircle2 className="w-10 h-10 text-pm-success" />
              ) : (
                <AlertCircle className="w-10 h-10 text-pm-warning" />
              )}
              <div>
                <h3 className="text-xl text-pm-text">
                  {importResults.mode === 'dry-run' ? 'Preview Complete' : (importResults.isUpdateMode ? 'Upsert Complete' : 'Import Complete')}
                </h3>
                <p className="text-pm-text-muted text-sm">
                  {importResults.success} of {importResults.total} items {importResults.mode === 'dry-run' ? 'ready to import' : 'processed'}
                </p>
              </div>
            </div>

            {/* Dry-run update mode info */}
            {importResults.mode === 'dry-run' && importResults.isUpdateMode && (
              <div className="mb-6 p-4 bg-pm-blue/10 border border-pm-blue/30 text-sm text-pm-text">
                <p className="font-medium mb-1">Update Mode Preview</p>
                <p className="text-pm-text-muted">
                  {importResults.itemsWithId} items have an ID (will match by ID) &bull;{' '}
                  {importResults.itemsWithSlug} items have a slug only (will match by slug) &bull;{' '}
                  {importResults.itemsNew} items have no ID or slug (will be created as new)
                </p>
              </div>
            )}

            {/* Stats */}
            {importResults.isUpdateMode && importResults.mode === 'live' ? (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-pm-dark p-4 border border-pm-border">
                  <p className="text-2xl text-pm-text">{importResults.total}</p>
                  <p className="text-xs uppercase tracking-widest text-pm-text-muted">Total</p>
                </div>
                <div className="bg-pm-dark p-4 border border-pm-border">
                  <p className="text-2xl text-pm-blue">{importResults.updated || 0}</p>
                  <p className="text-xs uppercase tracking-widest text-pm-text-muted">Updated</p>
                </div>
                <div className="bg-pm-dark p-4 border border-pm-border">
                  <p className="text-2xl text-pm-success">{importResults.created || 0}</p>
                  <p className="text-xs uppercase tracking-widest text-pm-text-muted">Created</p>
                </div>
                <div className="bg-pm-dark p-4 border border-pm-border">
                  <p className="text-2xl text-pm-error">{importResults.errors.length}</p>
                  <p className="text-xs uppercase tracking-widest text-pm-text-muted">Errors</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-pm-dark p-4 border border-pm-border">
                  <p className="text-2xl text-pm-text">{importResults.total}</p>
                  <p className="text-xs uppercase tracking-widest text-pm-text-muted">Total Items</p>
                </div>
                <div className="bg-pm-dark p-4 border border-pm-border">
                  <p className="text-2xl text-pm-success">{importResults.success}</p>
                  <p className="text-xs uppercase tracking-widest text-pm-text-muted">Successful</p>
                </div>
                <div className="bg-pm-dark p-4 border border-pm-border">
                  <p className="text-2xl text-pm-error">{importResults.errors.length}</p>
                  <p className="text-xs uppercase tracking-widest text-pm-text-muted">Errors</p>
                </div>
              </div>
            )}

            {/* Debug info for upsert */}
            {importResults._debug && (
              <div className="mb-6 p-4 bg-pm-gray border border-pm-border text-xs font-mono overflow-auto max-h-48">
                <p className="text-pm-accent mb-2 uppercase tracking-widest text-xs font-sans">Diagnostic Info</p>
                <p className="text-pm-text-muted">Existing items fetched: <span className="text-pm-text">{importResults._debug.existingCount}</span></p>
                <p className="text-pm-text-muted mt-1">Existing IDs (first 5): <span className="text-pm-text">{importResults._debug.existingIds?.join(', ') || 'none'}</span></p>
                <p className="text-pm-text-muted mt-1">Existing slugs (first 5): <span className="text-pm-text">{importResults._debug.existingSlugs?.join(', ') || 'none'}</span></p>
                <p className="text-pm-text-muted mt-1">Incoming IDs (first 5): <span className="text-pm-text">{importResults._debug.incomingIds?.join(', ') || 'none'}</span></p>
                <p className="text-pm-text-muted mt-1">Incoming slugs (first 5): <span className="text-pm-text">{importResults._debug.incomingSlugs?.join(', ') || 'none'}</span></p>
              </div>
            )}

            {/* Errors */}
            {importResults.errors.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-widest text-pm-error mb-2">Errors</h4>
                <div className="bg-pm-error/10 border border-pm-error/30 p-4 max-h-40 overflow-auto">
                  {importResults.errors.map((err, i) => (
                    <div key={i} className="text-sm text-pm-error mb-1">
                      Row {err.index + 1}: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button onClick={reset} className="btn btn-secondary">
                <RefreshCw className="w-4 h-4" />
                Start Over
              </button>
              {importResults.mode === 'dry-run' && (
                <button
                  onClick={() => { setIsDryRun(false); setImportResults(null); runImport(false); }}
                  className="btn btn-primary"
                >
                  <Play className="w-4 h-4" />
                  {isUpdateMode ? 'Run Live Upsert' : 'Run Live Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataImporter;
