
import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Code2, 
  FileText, 
  Play, 
  ChevronRight,
  Terminal,
  Info,
  Search,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
  Eye,
  X,
  Eraser,
  Link as LinkIcon,
  Upload,
  Image as ImageIcon,
  Music,
  Video,
  Zap
} from 'lucide-react';
import { ViewType, Collection, Document, QueryResult } from './types';
import { apiService } from './services/apiService';
import { NAV_ITEMS, PHP_SOURCE_CODE, API_SOURCE_CODE, API_BASE_URL, TYPESCRIPT_USAGE_CODE } from './constants';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize view from URL hash if present
  const getInitialView = (): ViewType => {
    const hash = window.location.hash.replace('#/', '');
    const validViews: ViewType[] = ['dashboard', 'collections', 'query', 'source', 'usage'];
    return validViews.includes(hash as ViewType) ? (hash as ViewType) : 'dashboard';
  };

  const [activeView, setActiveView] = useState<ViewType>(getInitialView());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionDocs, setCollectionDocs] = useState<Document[]>([]);
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  
  // Query Lab States
  const [queryInput, setQueryInput] = useState<string>('{\n  "age": { "$gt": 20 }\n}');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // Sync state with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      setActiveView(getInitialView());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when state changes internally (e.g. from sidebar clicks)
  const navigateTo = (view: ViewType) => {
    window.location.hash = `/${view}`;
    setActiveView(view);
  };

  useEffect(() => {
    refreshCollections();
  }, []);

  const refreshCollections = async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      const names = await apiService.listCollections();
      const colData: Collection[] = await Promise.all(names.map(async (name) => {
        try {
          const docs = await apiService.getCollectionDocs(name);
          return {
            name,
            documents: docs,
            createdAt: Date.now()
          };
        } catch (e) {
          return { name, documents: [], createdAt: 0 };
        }
      }));
      setCollections(colData);
      setIsApiOnline(true);
    } catch (err) {
      console.error("Connection check failed:", err);
      setIsApiOnline(false);
      setLastError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionDocs(selectedCollection);
    }
  }, [selectedCollection]);

  const fetchCollectionDocs = async (name: string) => {
    try {
      const docs = await apiService.getCollectionDocs(name);
      setCollectionDocs(docs);
    } catch (err) {
      setLastError((err as Error).message);
    }
  };

  const handleCreateCollection = async () => {
    const name = prompt('Enter collection name:');
    if (name) {
      setIsLoading(true);
      try {
        await apiService.createCollection(name);
        await refreshCollections();
        alert(`Collection "${name}" created successfully on remote server.`);
      } catch (err) {
        const msg = (err as Error).message;
        setLastError(msg);
        alert('Failed to create collection: ' + msg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteCollection = async (name: string) => {
    if (confirm(`Are you sure you want to drop the collection "${name}"?`)) {
      setIsLoading(true);
      try {
        await apiService.dropCollection(name);
        await refreshCollections();
        if (selectedCollection === name) setSelectedCollection(null);
      } catch (err) {
        alert('Failed to drop collection: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClearCollectionData = async (name: string) => {
    if (confirm(`Are you sure you want to delete ALL documents in "${name}"? This cannot be undone.`)) {
      setIsLoading(true);
      try {
        await apiService.delete(name, {}); // Empty query deletes everything
        await fetchCollectionDocs(name);
        await refreshCollections();
      } catch (err) {
        alert('Failed to clear data: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCollection) return;

    setIsLoading(true);
    try {
      // 1. Upload file
      const result = await apiService.uploadFile(file);
      
      // 2. Store link in collection
      const doc = {
        filename: result.filename,
        url: result.url,
        type: result.mime,
        size: result.size,
        uploadedAt: new Date().toISOString()
      };
      
      await apiService.insert(selectedCollection, doc);
      
      // 3. Refresh UI
      await fetchCollectionDocs(selectedCollection);
      await refreshCollections();
      
      alert(`Successfully uploaded "${file.name}" and stored link in "${selectedCollection}"`);
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeQuery = async () => {
    if (!selectedCollection) return alert('Select a collection first');
    try {
      const start = performance.now();
      const parsedQuery = JSON.parse(queryInput);
      const data = await apiService.find(selectedCollection, parsedQuery);
      const end = performance.now();
      setQueryResult({ data, executionTime: end - start });
    } catch (e) {
      alert('Error executing query: ' + (e as Error).message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {lastError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-red-400">Connection Error</h4>
            <p className="text-red-300/80">{lastError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:border-indigo-500/50 transition-all cursor-default group">
          <div className="flex items-center justify-between mb-4">
            <Database className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-3xl font-bold">{collections.length}</span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Collections</h3>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:border-emerald-500/50 transition-all cursor-default group">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-3xl font-bold">
              {collections.reduce((acc, c) => acc + c.documents.length, 0)}
            </span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Documents</h3>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:border-amber-500/50 transition-all cursor-default group">
          <div className="flex items-center justify-between mb-4">
            <Terminal className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-3xl font-bold">{isApiOnline ? 'OK' : 'FAIL'}</span>
          </div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Remote Status</h3>
        </div>
      </div>

      <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-500/20 p-2 rounded-lg">
            <Info className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-200 mb-2">Remote System Status</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Endpoint: <code className="text-indigo-400 bg-slate-900 px-2 py-1 rounded">{API_BASE_URL}/api.php</code>. 
              If operations fail, ensure the server treats <code className="text-xs">.php</code> as a PHP script and that the <code className="text-xs">./db/</code> folder is writable (CHMOD 777).
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isApiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-sm font-medium text-slate-300">{isApiOnline ? 'Backend Online' : 'Backend Unreachable'}</span>
              <button onClick={refreshCollections} className="ml-4 text-xs text-indigo-400 hover:underline flex items-center gap-1">
                <Loader2 className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Reconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCollections = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-400" />
          Collections
        </h2>
        <button 
          onClick={handleCreateCollection}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New Collection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map(col => (
          <div 
            key={col.name} 
            className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedCollection === col.name ? 'bg-slate-800 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}
            onClick={() => setSelectedCollection(col.name)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-lg text-slate-100">{col.name}</h4>
                <p className="text-xs text-slate-500">Live Collection</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.name); }}
                className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-slate-500">Docs:</span>
                <span className="ml-2 font-mono text-indigo-400">{col.documents.length}</span>
              </div>
            </div>
          </div>
        ))}
        {collections.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
             No collections found on remote server.
          </div>
        )}
      </div>

      {selectedCollection && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden mt-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="px-6 py-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50">
            <h3 className="font-semibold text-slate-300">Remote Documents: {selectedCollection}</h3>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept=".wav,.mp4,.jpg,.png,.jpeg"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="text-xs bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all font-medium flex items-center gap-1.5"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload Media
              </button>

              <button 
                onClick={async () => {
                  const data = prompt('Enter document JSON:', '{"name": "test"}');
                  if (data) {
                    try {
                      await apiService.insert(selectedCollection, JSON.parse(data));
                      fetchCollectionDocs(selectedCollection);
                      refreshCollections();
                    } catch (e) { alert('Insert Failed: ' + (e as Error).message); }
                  }
                }}
                className="text-xs bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all font-medium flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Doc
              </button>
              
              <button 
                onClick={() => handleClearCollectionData(selectedCollection)}
                className="text-xs bg-amber-600/10 text-amber-400 hover:bg-amber-600 hover:text-white px-3 py-1.5 rounded-lg border border-amber-500/20 transition-all font-medium flex items-center gap-1.5"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clear Data
              </button>

              <button 
                onClick={() => handleDeleteCollection(selectedCollection)}
                className="text-xs bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg border border-red-500/20 transition-all font-medium flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Drop Collection
              </button>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Data Preview</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collectionDocs.map(doc => {
                  const isMedia = !!doc.url;
                  let MediaIcon = FileText;
                  if (doc.type?.startsWith('image/')) MediaIcon = ImageIcon;
                  else if (doc.type?.startsWith('audio/')) MediaIcon = Music;
                  else if (doc.type?.startsWith('video/')) MediaIcon = Video;

                  return (
                    <tr key={doc._id} className="border-b border-slate-700/50 hover:bg-slate-700/20 group">
                      <td className="py-3">
                        <MediaIcon className={`w-4 h-4 ${isMedia ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-xs max-w-xs truncate">
                        {isMedia ? (
                          <div className="flex flex-col">
                            <span className="text-slate-200 font-semibold">{doc.filename}</span>
                            <span className="text-[10px] text-slate-500 truncate">{doc.url}</span>
                          </div>
                        ) : (
                          JSON.stringify(doc).substring(0, 100) + (JSON.stringify(doc).length > 100 ? '...' : '')
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isMedia && (
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-emerald-400 transition-colors p-1"
                              title="Open Media"
                            >
                              <LinkIcon className="w-4 h-4" />
                            </a>
                          )}
                          <button 
                            onClick={() => setViewingDoc(doc)}
                            className="text-slate-600 hover:text-indigo-400 transition-colors p-1"
                            title="View all data"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('Delete this document?')) {
                                await apiService.delete(selectedCollection, { _id: doc._id });
                                fetchCollectionDocs(selectedCollection);
                                refreshCollections();
                              }
                            }}
                            className="text-slate-600 hover:text-red-400 transition-colors p-1"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {collectionDocs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-600 italic">
                      This collection is currently empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderUsage = () => {
    const directLink = `${window.location.origin}${window.location.pathname}#/usage`;
    
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-400" />
          <h2 className="text-3xl font-bold">TypeScript Implementation Guide</h2>
        </div>
        
        {/* Direct Link Section */}
        <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LinkIcon className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Share this page</p>
              <p className="text-sm text-slate-400 font-mono">{directLink}</p>
            </div>
          </div>
          <button 
            onClick={() => copyToClipboard(directLink)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Direct Link
          </button>
        </div>

        <p className="text-slate-400">
          Integrating the file-based JSON database into your TypeScript frontend is straightforward. 
          Simply use the standard <code>fetch</code> API to communicate with the REST actions exposed by <code>api.php</code>.
        </p>

        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="ml-2 font-mono text-xs text-slate-400 uppercase tracking-widest">example.ts</span>
            </div>
            <button 
              onClick={() => copyToClipboard(TYPESCRIPT_USAGE_CODE)}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <div className="p-6 overflow-auto max-h-[600px] bg-slate-950">
            <pre className="font-mono text-sm text-indigo-100 leading-relaxed">
              {TYPESCRIPT_USAGE_CODE}
            </pre>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-xl">
            <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              CORS Configuration
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ensure your remote server allows requests from your frontend origin. The provided PHP source includes robust CORS headers for <code>OPTIONS</code>, <code>POST</code>, and <code>GET</code>.
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-xl">
            <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Writing Permissions
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The <code>./db/</code> folder on your server MUST be writable. Use <code>chmod 777 db</code> if you encounter "Failed to write" errors in the dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderQueryLab = () => {
    const queryPresets = [
      { label: 'Find All', icon: <Search className="w-3 h-3" />, query: '{}' },
      { label: 'All Media', icon: <LinkIcon className="w-3 h-3" />, query: '{\n  "url": { "$regex": "http" }\n}' },
      { label: 'Images Only', icon: <ImageIcon className="w-3 h-3" />, query: '{\n  "type": { "$regex": "image" }\n}' },
      { label: 'Videos Only', icon: <Video className="w-3 h-3" />, query: '{\n  "type": { "$regex": "video" }\n}' },
      { label: 'Audios Only', icon: <Music className="w-3 h-3" />, query: '{\n  "type": { "$regex": "audio" }\n}' },
      { label: 'Large Files', icon: <Zap className="w-3 h-3" />, query: '{\n  "size": { "$gt": 1000000 }\n}' },
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-bold">Remote Query Explorer</h2>
            <div className="flex items-center gap-2">
              <select 
                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                onChange={(e) => setSelectedCollection(e.target.value)}
                value={selectedCollection || ''}
              >
                <option value="">Select Collection</option>
                {collections.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <Code2 className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Query Presets</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {queryPresets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => setQueryInput(preset.query)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    {preset.icon}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea 
              className="flex-1 bg-transparent p-4 font-mono text-sm text-indigo-200 outline-none resize-none leading-relaxed"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              spellCheck={false}
            />
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Play className="w-3 h-3" />
                Executes on artificialfiretiger.com
              </div>
              <button 
                onClick={executeQuery}
                disabled={!selectedCollection || isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Execute
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Results</h2>
          <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            {queryResult ? (
              <>
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400">{queryResult.data.length} documents found</span>
                  <span className="text-xs font-mono text-emerald-400">Time: {queryResult.executionTime.toFixed(3)}ms</span>
                </div>
                <pre className="flex-1 overflow-auto p-4 font-mono text-sm text-slate-300">
                  {JSON.stringify(queryResult.data, null, 2)}
                </pre>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>Run a query to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSourceCode = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Backend Implementation</h2>
          <p className="text-slate-400 text-sm">Review the deployed PHP logic currently running at {API_BASE_URL}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
          <div className="bg-slate-900 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
            <span className="font-mono text-emerald-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> JsonDB.php
            </span>
            <button 
              onClick={() => copyToClipboard(PHP_SOURCE_CODE)}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? 'Copied!' : 'Copy Source'}
            </button>
          </div>
          <div className="p-6 overflow-auto max-h-[400px]">
            <pre className="font-mono text-sm text-slate-300">
              {PHP_SOURCE_CODE}
            </pre>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
          <div className="bg-slate-900 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
            <span className="font-mono text-amber-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> api.php
            </span>
            <button 
              onClick={() => copyToClipboard(API_SOURCE_CODE)}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? 'Copied!' : 'Copy Source'}
            </button>
          </div>
          <div className="p-6 overflow-auto max-h-[400px]">
            <pre className="font-mono text-sm text-slate-300">
              {API_SOURCE_CODE}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 group cursor-default">
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-indigo-500/20">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">PHP-NoSQL</h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Remote Mode</p>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as ViewType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeView === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800 space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
              API STATUS
              {isApiOnline === true ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
            </h4>
            <p className="text-[10px] font-mono text-indigo-300 truncate">{API_BASE_URL}</p>
          </div>
          {isLoading && (
             <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
               <Loader2 className="w-3 h-3 animate-spin" />
               Processing...
             </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="capitalize">{activeView}</span>
            {selectedCollection && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-indigo-400 font-medium">{selectedCollection}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
               ENDPOINT: artificialfiretiger.com
             </div>
          </div>
        </header>

        <div className="p-8">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'collections' && renderCollections()}
          {activeView === 'query' && renderQueryLab()}
          {activeView === 'usage' && renderUsage()}
          {activeView === 'source' && renderSourceCode()}
        </div>
      </main>

      {/* Document Detail Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-indigo-300 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Details
              </h3>
              <button 
                onClick={() => setViewingDoc(null)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono text-sm">
              <pre className="text-emerald-400 leading-relaxed">
                {JSON.stringify(viewingDoc, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
               <button 
                onClick={() => {
                  copyToClipboard(JSON.stringify(viewingDoc, null, 2));
                  alert('Document copied to clipboard');
                }}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy JSON
              </button>
              <button 
                onClick={() => setViewingDoc(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
