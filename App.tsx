
import React, { useState, useEffect } from 'react';
import { Settings, LayoutGrid, Cpu, Github, Moon, Sun, Bell, Search, User } from 'lucide-react';
import BrowserGenerator from './components/BrowserGenerator';
import SettingsView from './components/SettingsView';
import { AppMode, OllamaConfig } from './types';
import { DEFAULT_MODEL, DEFAULT_EMBEDDING_MODEL, OLLAMA_DEFAULT_URL } from './utils/constants';

const CONFIG_STORAGE_KEY = 'rayan_ollama_config';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Lifted Config State with Persistence
  const [config, setConfig] = useState<OllamaConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (savedConfig) {
          return JSON.parse(savedConfig);
        }
      } catch (error) {
        console.warn('Failed to load config from storage, using defaults.', error);
      }
    }
    return {
      baseUrl: OLLAMA_DEFAULT_URL,
      model: DEFAULT_MODEL,
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      persona: ''
    };
  });

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Sidebar Component
  const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span className="font-bold text-sm">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
    </button>
  );

  return (
    <div className={`min-h-screen flex font-sans ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#F8FAFC]'} transition-colors duration-300`}>
      {/* App Sidebar (Navigation) */}
      <aside className={`w-20 lg:w-72 shrink-0 border-r ${isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'} flex flex-col z-50 sticky top-0 h-screen transition-all`}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-transparent">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                <Cpu className="w-6 h-6" />
             </div>
             <div className="hidden lg:block">
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">RAYAN <span className="text-brand-600">HAMAFZA</span></h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">Enterprise Knowledge</p>
             </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2">
           <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-4 mb-2 hidden lg:block">Main Menu</div>
           <SidebarItem
              icon={LayoutGrid}
              label="Dashboard"
              active={mode === AppMode.DASHBOARD}
              onClick={() => setMode(AppMode.DASHBOARD)}
           />
           <SidebarItem
              icon={Settings}
              label="Settings"
              active={mode === AppMode.SETTINGS}
              onClick={() => setMode(AppMode.SETTINGS)}
           />
        </nav>

        {/* Bottom Actions */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
           <a
             href="https://github.com/rayan-ai"
             target="_blank"
             rel="noreferrer"
             className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all group"
           >
              <Github className="w-5 h-5 text-slate-400 group-hover:text-black" />
              <span className="font-bold text-sm hidden lg:block">Documentation</span>
           </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className={`h-20 shrink-0 px-8 flex items-center justify-between z-40 sticky top-0 backdrop-blur-xl border-b ${isDarkMode ? 'bg-[#0f172a]/80 border-slate-700' : 'bg-[#F8FAFC]/80 border-slate-200'}`}>
           <div className="flex-1 max-w-xl">
              {mode === AppMode.DASHBOARD && (
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                   <input
                      type="text"
                      placeholder="Search knowledge base..."
                      className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm placeholder:text-slate-400"
                   />
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500">⌘K</kbd>
                   </div>
                </div>
              )}
           </div>

           <div className="flex items-center gap-4 pl-8">
              <button className="p-2.5 rounded-xl text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-700 transition-all relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[#F8FAFC]"></span>
              </button>
              <div className="h-8 w-px bg-slate-200 mx-1"></div>
              <button className="flex items-center gap-3 p-1.5 pr-4 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-100">
                 <div className="w-9 h-9 rounded-full bg-gradient-to-r from-brand-500 to-accent-pink p-[2px]">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                       <User className="w-5 h-5 text-slate-700" />
                    </div>
                 </div>
                 <div className="text-left hidden sm:block">
                    <div className="text-sm font-bold text-slate-700">Admin User</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Team Lead</div>
                 </div>
              </button>
           </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-hidden relative">
           {mode === AppMode.DASHBOARD ? (
              <div className="absolute inset-0 overflow-hidden">
                 <BrowserGenerator config={config} />
              </div>
           ) : (
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-8">
                 <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Settings</h2>
                    <p className="text-slate-500 mb-8">Configure your AI models and environment connection.</p>
                    <SettingsView config={config} setConfig={setConfig} />
                 </div>
              </div>
           )}
        </main>
      </div>
    </div>
  );
};

export default App;
