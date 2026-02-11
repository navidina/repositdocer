
import React, { useState, useEffect } from 'react';
import { Settings, Github, Cpu, LayoutGrid, Sliders } from 'lucide-react';
import BrowserGenerator from './components/BrowserGenerator';
import SettingsView from './components/SettingsView';
import { AppMode, OllamaConfig } from './types';
import { DEFAULT_MODEL, DEFAULT_EMBEDDING_MODEL, OLLAMA_DEFAULT_URL } from './utils/constants';

const CONFIG_STORAGE_KEY = 'rayan_ollama_config';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  
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
      persona: '' // Default empty persona
    };
  });

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F0F4F8] overflow-x-hidden selection:bg-brand-200 selection:text-brand-900">
      {/* Background Decor - Refined */}
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-brand-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob"></div>
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-pink/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="fixed bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-accent-blue/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 pt-4 px-6 pb-2">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white/60 mx-auto max-w-[1600px] px-8 h-24 flex items-center justify-between transition-all hover:shadow-md">
          
          {/* Logo Section */}
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-3 rounded-2xl shadow-lg shadow-brand-500/30 text-white transform hover:rotate-3 transition-transform">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-800 flex flex-col leading-none gap-1">
                <span>RAYAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-pink">HAMAFZA</span></span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase opacity-70">Intelligent Documentation</p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center bg-slate-100/50 p-2 rounded-2xl border border-white/50 backdrop-blur-sm">
            <button
              onClick={() => setMode(AppMode.DASHBOARD)}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === AppMode.DASHBOARD 
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              داشبورد
            </button>
            <button
              onClick={() => setMode(AppMode.SETTINGS)}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === AppMode.SETTINGS 
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
              }`}
            >
              <Settings className="w-4 h-4" />
              تنظیمات
            </button>
          </nav>

          {/* User/Social */}
          <div className="flex items-center gap-4">
             <a 
               href="https://github.com" 
               target="_blank" 
               rel="noreferrer" 
               className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-black hover:scale-110 transition-all shadow-sm group"
               aria-label="View source on GitHub"
             >
                <Github className="w-5 h-5" />
             </a>
             <div className="h-12 px-6 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 shadow-xl shadow-slate-900/20 flex items-center justify-center text-white font-bold text-sm border border-slate-700">
                v3.0 Pro
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 overflow-hidden z-10">
        <div className="max-w-[1600px] mx-auto h-full">
          {mode === AppMode.DASHBOARD ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
              <div className="flex-1 min-h-0">
                <BrowserGenerator config={config} />
              </div>
            </div>
          ) : (
             <div className="h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center custom-scrollbar">
               <div className="mb-12 text-center relative w-full pt-10">
                 <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-96 h-40 bg-brand-500/20 blur-[90px] rounded-full -z-10"></div>
                <h2 className="text-4xl font-black text-slate-800 mb-3 tracking-tight flex items-center justify-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-md"><Sliders className="w-8 h-8 text-brand-600" /></div>
                  تنظیمات برنامه
                </h2>
                <p className="text-slate-500 max-w-lg mx-auto text-base leading-relaxed font-medium">
                  پیکربندی پیشرفته موتور هوش مصنوعی و اتصال به شبکه عصبی محلی
                </p>
              </div>
               <SettingsView config={config} setConfig={setConfig} />
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
