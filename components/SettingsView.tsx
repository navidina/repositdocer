
import React, { useState, useEffect } from 'react';
import { OllamaConfig } from '../types';
import { Server, Cpu, Database, CheckCircle2, XCircle, RotateCcw, Zap, UserCog, Briefcase, Trash2, ShieldAlert, Rocket } from 'lucide-react';
import { checkOllamaConnection } from '../services/ollamaService';
import { PERSONA_BLOCKCHAIN_ARCHITECT, DEFAULT_MODEL, DEFAULT_EMBEDDING_MODEL, OLLAMA_DEFAULT_URL } from '../utils/constants';
import { deleteDB } from 'idb';

interface SettingsViewProps {
  config: OllamaConfig;
  setConfig: (config: OllamaConfig) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ config, setConfig }) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');

  const handleCheckConnection = async () => {
    setStatus('checking');
    const isConnected = await checkOllamaConnection(config);
    if (isConnected) {
      setStatus('connected');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
    }
  };

  const handleReset = () => {
    setConfig({
      baseUrl: OLLAMA_DEFAULT_URL,
      model: DEFAULT_MODEL,
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      persona: ''
    });
    setStatus('idle');
  };

  const handleClearData = async () => {
    if (window.confirm('آیا مطمئن هستید؟ تمام مستندات ذخیره شده، کش فایل‌ها و تغییرات دستی پاک خواهند شد.')) {
        try {
            localStorage.removeItem('rayan_docs_session');
            localStorage.removeItem('rayan_manual_overrides');
            localStorage.removeItem('rayan_chat_history');
            localStorage.removeItem('rayan_file_cache');
            
            await deleteDB('rayan-meta-db');
            await deleteDB('rayan-vector-store');
            
            alert('تمامی داده‌ها با موفقیت پاک شدند. برای مشاهده تغییرات به داشبورد برگردید (صفحه رفرش می‌شود).');
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('خطا در پاکسازی داده‌ها.');
        }
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-6 pb-12">
      
      {/* Connection Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-[4rem] -z-0"></div>
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="bg-brand-100 p-3 rounded-2xl text-brand-600">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">اتصال به LM Studio</h3>
            <p className="text-sm text-slate-400">تنظیمات سرور شبکه (IP: 192.168.167.18)</p>
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 mr-1">آدرس سرور (Base URL)</label>
            <div className="relative group">
              <input 
                type="text" 
                value={config.baseUrl} 
                onChange={(e) => setConfig({...config, baseUrl: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-600 font-mono text-left dir-ltr focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all outline-none"
                placeholder="e.g., http://192.168.167.18:1234"
              />
              <div className="absolute right-3 top-3 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm text-[10px] font-bold text-slate-400">Required</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 mr-2">
              مطمئن شوید که LM Studio در آدرس <strong>{OLLAMA_DEFAULT_URL}</strong> در حال اجراست و <strong>Start Server</strong> فعال شده است.
            </p>
          </div>

          {status === 'error' && (
             <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 leading-relaxed">
                   <p className="font-bold mb-1">خطا در اتصال!</p>
                   <ul className="list-disc list-inside space-y-1 opacity-90">
                      <li>آیا LM Studio در حال اجراست؟</li>
                      <li>در تنظیمات LM Studio گزینه <strong>Cross-Origin-Resource-Sharing (CORS)</strong> را فعال کنید.</li>
                      <li>فایروال ویندوز/آنتی‌ویروس را چک کنید که پورت 1234 را نبسته باشد.</li>
                      <li>مطمئن شوید که آدرس IP صحیح است.</li>
                   </ul>
                </div>
             </div>
          )}

          <div className="flex items-center gap-4">
            <button 
              onClick={handleCheckConnection}
              disabled={status === 'checking'}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                status === 'connected' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                status === 'error' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                'bg-brand-600 text-white shadow-glow hover:shadow-lg hover:bg-brand-700'
              }`}
            >
              {status === 'checking' && <RotateCcw className="w-4 h-4 animate-spin" />}
              {status === 'connected' && <CheckCircle2 className="w-4 h-4" />}
              {status === 'error' && <XCircle className="w-4 h-4" />}
              
              {status === 'checking' ? 'بررسی اتصال...' : 
               status === 'connected' ? 'اتصال برقرار است' : 
               status === 'error' ? 'خطا در اتصال' : 'تست اتصال'}
            </button>
            
            <button 
              onClick={handleReset}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              بازنشانی پیش‌فرض
            </button>
          </div>
        </div>
      </div>

      {/* Persona Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">نقش هوشمند (Persona)</h3>
            <p className="text-sm text-slate-400">تعیین شخصیت و تخصص دستیار برای تحلیل پروژه</p>
          </div>
        </div>

        <div className="space-y-4">
           <label className="block text-sm font-bold text-slate-700 mr-1">دستورالعمل سیستم (System Instruction)</label>
           <textarea 
              value={config.persona}
              onChange={(e) => setConfig({...config, persona: e.target.value})}
              placeholder="مثال: شما یک متخصص امنیت سایبری هستید. کدها را فقط از نظر آسیب‌پذیری بررسی کنید..."
              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 text-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none"
           />
           
           <div className="flex gap-2 flex-wrap">
              <button 
                 onClick={() => setConfig({...config, persona: ''})}
                 className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                 پیش‌فرض (نویسنده فنی)
              </button>
              <button 
                 onClick={() => setConfig({...config, persona: PERSONA_BLOCKCHAIN_ARCHITECT})}
                 className="px-3 py-1.5 rounded-lg bg-purple-50 text-xs font-bold text-purple-600 border border-purple-100 hover:bg-purple-100 transition-colors flex items-center gap-1"
              >
                 <Briefcase className="w-3 h-3"/> معمار بلاکچین
              </button>
           </div>
        </div>
      </div>

      {/* Models Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-accent-pink/10 p-3 rounded-2xl text-accent-pink">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">انتخاب مدل‌ها</h3>
            <p className="text-sm text-slate-400">تعیین مدل‌های پردازش متن و وکتور (بارگذاری شده در LM Studio)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Main Model */}
          <div className="space-y-3">
             <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Zap className="w-4 h-4 text-brand-500" />
                مدل اصلی (Main Model)
             </label>
             <input 
                type="text" 
                value={config.model} 
                onChange={(e) => setConfig({...config, model: e.target.value})}
                placeholder="e.g. qwen2.5-coder-32b-instruct"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-600 font-mono text-left dir-ltr focus:ring-2 focus:ring-brand-200 outline-none transition-all"
              />
              <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                مدلی که در LM Studio لود شده است. برای استفاده از هر مدلی که فعال است، می‌توانید از <span className="font-mono text-brand-600">local-model</span> استفاده کنید.
              </div>
          </div>

          {/* Embedding Model */}
          <div className="space-y-3">
             <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Database className="w-4 h-4 text-accent-blue" />
                مدل امبدینگ (Embedding Model)
             </label>
             <input 
                type="text" 
                value={config.embeddingModel} 
                onChange={(e) => setConfig({...config, embeddingModel: e.target.value})}
                placeholder="e.g. text-embedding-nomic-embed-text-v1.5"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-600 font-mono text-left dir-ltr focus:ring-2 focus:ring-brand-200 outline-none transition-all"
              />
              <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                مدل امبدینگ باید در LM Studio پشتیبانی شود (معمولاً مدل‌هایی مثل Nomic یا Jina).
              </div>
          </div>
        </div>
      </div>

       {/* Data Management */}
       <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-white border-t-4 border-t-red-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-red-50 p-3 rounded-2xl text-red-500">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">مدیریت داده‌ها</h3>
            <p className="text-sm text-slate-400">پاکسازی حافظه و مستندات ذخیره شده</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
            <div className="text-xs text-red-700 leading-relaxed">
                <span className="font-bold block mb-1">توجه:</span>
                با فشردن دکمه مقابل، تمامی مستندات تولید شده، کش فایل‌ها و تاریخچه چت‌ها به طور کامل از حافظه مرورگر پاک خواهند شد و قابل بازیابی نیستند.
            </div>
            <button 
                onClick={handleClearData}
                className="whitespace-nowrap px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4" />
                حذف همه داده‌ها
            </button>
        </div>
      </div>

    </div>
  );
};

export default SettingsView;
