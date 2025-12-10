import { useState, useEffect, useCallback } from 'react';
import { 
  Database, Image, Settings, Upload, Download, Trash2, Plus, 
  ChevronRight, Check, X, AlertCircle, Loader2, RefreshCw,
  FolderOpen, FileJson, Grid3X3, Eye, Edit2, Save, Crop
} from 'lucide-react';
import WebflowClient, { isValidToken, FIELD_TYPES } from './utils/webflow';
import ImageProcessor from './components/ImageProcessor';
import CMSManager from './components/CMSManager';
import DataImporter from './components/DataImporter';

function App() {
  const [activeTab, setActiveTab] = useState('cms');
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('webflow_token') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [client, setClient] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [collections, setCollections] = useState([]);

  // Connect to Webflow
  const connect = useCallback(async () => {
    if (!isValidToken(apiToken)) {
      setConnectionError('Invalid API token format');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const webflowClient = new WebflowClient(apiToken);
      const sitesData = await webflowClient.getSites();
      
      setClient(webflowClient);
      setSites(sitesData);
      setIsConnected(true);
      localStorage.setItem('webflow_token', apiToken);

      // Auto-select first site
      if (sitesData.length > 0) {
        setSelectedSite(sitesData[0]);
        const collectionsData = await webflowClient.getCollections(sitesData[0].id);
        setCollections(collectionsData);
      }
    } catch (error) {
      setConnectionError(error.message || 'Failed to connect to Webflow');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [apiToken]);

  // Disconnect
  const disconnect = () => {
    setClient(null);
    setSites([]);
    setSelectedSite(null);
    setCollections([]);
    setIsConnected(false);
    localStorage.removeItem('webflow_token');
  };

  // Load collections when site changes
  const handleSiteChange = async (siteId) => {
    const site = sites.find(s => s.id === siteId);
    setSelectedSite(site);
    
    if (client && site) {
      try {
        const collectionsData = await client.getCollections(site.id);
        setCollections(collectionsData);
      } catch (error) {
        console.error('Failed to load collections:', error);
      }
    }
  };

  // Auto-connect on load if token exists
  useEffect(() => {
    if (apiToken && !isConnected && !isConnecting) {
      connect();
    }
  }, []);

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-pm-border bg-pm-dark/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pm-accent/10 border border-pm-accent/30 flex items-center justify-center">
                  <Database className="w-5 h-5 text-pm-accent" />
                </div>
                <div>
                  <h1 className="font-display text-lg tracking-wider text-pm-text">WEBFLOW CMS TOOLKIT</h1>
                  <p className="text-xs text-pm-text-muted tracking-wider">PERCEPTION MARKETING</p>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-4">
              {isConnected ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-pm-success rounded-full animate-pulse"></div>
                    <span className="text-pm-text-muted">Connected to</span>
                    <select 
                      value={selectedSite?.id || ''} 
                      onChange={(e) => handleSiteChange(e.target.value)}
                      className="bg-pm-dark border-pm-border text-pm-text text-sm py-1"
                    >
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.displayName || site.name}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={disconnect} className="btn btn-ghost text-xs">
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Webflow API Token"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="w-64 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && connect()}
                  />
                  <button 
                    onClick={connect} 
                    disabled={isConnecting}
                    className="btn btn-primary"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {connectionError && (
            <div className="mt-3 flex items-center gap-2 text-pm-error text-sm">
              <AlertCircle className="w-4 h-4" />
              {connectionError}
            </div>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-pm-border bg-pm-gray/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('cms')}
              className={`tab ${activeTab === 'cms' ? 'active' : ''}`}
            >
              <span className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                CMS Manager
              </span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`tab ${activeTab === 'import' ? 'active' : ''}`}
            >
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Data Import
              </span>
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`tab ${activeTab === 'images' ? 'active' : ''}`}
            >
              <span className="flex items-center gap-2">
                <Crop className="w-4 h-4" />
                Image Processor
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'cms' && (
          <CMSManager 
            client={client}
            site={selectedSite}
            collections={collections}
            setCollections={setCollections}
            isConnected={isConnected}
          />
        )}
        {activeTab === 'import' && (
          <DataImporter 
            client={client}
            site={selectedSite}
            collections={collections}
            isConnected={isConnected}
          />
        )}
        {activeTab === 'images' && (
          <ImageProcessor />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-pm-border py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-pm-text-muted text-xs tracking-wider">
          BUILT BY PERCEPTION MARKETING • WEBFLOW CMS TOOLKIT v1.0
        </div>
      </footer>
    </div>
  );
}

export default App;
