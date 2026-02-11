
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { File as FileIcon, Folder, Play, Loader2, Download, Info, Eye, Code, Upload, MessageSquare, Send, Bot, User, Users, Database, Layers, Zap, LayoutTemplate, BrainCircuit, Github, BarChart3, Grip, Hash, Sparkles, Command, Box, Server, Terminal, Activity, PieChart, CheckCircle2, FileText, Cpu, Search, PenTool, ArrowRight, BookOpen, Workflow, Share2, Map, LayoutDashboard, Minimize2, Maximize2, X, ShieldAlert, Skull, Briefcase, RefreshCw, Zap as ZapIcon, Network, FileSearch, GitMerge, ListChecks, RotateCw, ChevronRight, FileCode2, ChevronLeft, SplitSquareHorizontal, RefreshCcw, Link2, Layout, TableProperties, ScrollText, Copy, Check, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { OllamaConfig, ProcessingLog, CodeSymbol, ProcessedFile, CodeIssue } from '../types';
import { LocalVectorStore } from '../services/vectorStore';
import { IGNORED_DIRS, ALLOWED_EXTENSIONS } from '../utils/constants';

import { useRepoProcessor } from '../hooks/useRepoProcessor';
import { useChat } from '../hooks/useChat';

import MarkdownRenderer from './MarkdownRenderer';
import MermaidRenderer from './MermaidRenderer';
import LiveVisualization from './LiveVisualization';
import ProjectStructureVisualizer from './ProjectStructureVisualizer';
import Playground from './Playground';
import { generateContentHash } from '../services/codeParser';

interface BrowserGeneratorProps {
  config: OllamaConfig;
}

// --- NEW: Professional Chat Code Block Component ---
const ChatCodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const codeText = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-slate-200 text-brand-800 px-1.5 py-0.5 rounded-md font-mono text-xs border border-slate-300 mx-1" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-700/50 shadow-md bg-[#0f172a] group dir-ltr text-left relative">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e293b] border-b border-slate-700/50 select-none">
        <div className="flex items-center gap-3">
           <div className="flex gap-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/50 group-hover:bg-red-500 transition-colors"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50 group-hover:bg-yellow-500 transition-colors"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-green-500/50 group-hover:bg-green-500 transition-colors"></div>
           </div>
           <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">{lang}</span>
        </div>
        <button 
            onClick={handleCopy} 
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md"
        >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto custom-scrollbar">
        <code className="font-mono text-xs text-blue-100 leading-relaxed block" {...props}>
          {children}
        </code>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: File Issues List ---
const FileIssuesList = ({ issues }: { issues: CodeIssue[] }) => {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      {issues.map(issue => (
        <div key={issue.id} className={`p-4 rounded-xl border-l-4 shadow-sm bg-slate-50 ${
            issue.severity === 'critical' ? 'border-red-500 bg-red-50/20' :
            issue.severity === 'high' ? 'border-orange-500 bg-orange-50/20' :
            issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-50/20' : 'border-blue-500 bg-blue-50/20'
        }`}>
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    issue.category === 'security' ? 'bg-red-100 text-red-600' :
                    issue.category === 'performance' ? 'bg-purple-100 text-purple-600' :
                    'bg-slate-200 text-slate-600'
                }`}>
                    {issue.category}
                </span>
                <span className={`text-[10px] font-bold uppercase ${
                    issue.severity === 'critical' ? 'text-red-600' : 'text-slate-500'
                }`}>{issue.severity}</span>
                <h4 className="font-bold text-slate-800 text-sm ml-2">{issue.title}</h4>
             </div>
             <span className="text-xs font-mono text-slate-400 bg-white px-2 rounded">Line {issue.line}</span>
          </div>
          
          <p className="text-xs text-slate-600 mt-1 leading-relaxed pl-1">{issue.description}</p>
          
          {issue.suggestion && (
            <div className="mt-3 bg-white p-2 rounded-lg border border-slate-200 flex gap-2 items-start">
               <span className="text-emerald-600 font-bold text-xs shrink-0">Suggestion:</span>
               <p className="text-xs text-slate-700 font-mono">{issue.suggestion}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// --- NEW COMPONENT: Split View for Code Analysis ---
const CodeAnalysisViewer = ({ content, knowledgeGraph, onSave, fileMap, onReanalyze, onAskAI }: any) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'analysis' | 'code'>('split');

  // Parse sections
  const fileSections = useMemo(() => {
    if (!content) return [];
    const parts = content.split(/\n##\s+/).filter((p: string) => p.trim().length > 0);
    return parts.map((part: string) => {
        const lines = part.split('\n');
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n');
        return {
            title,
            content: `## ${title}\n${body}`,
            lines: body.split('\n').length
        };
    }).filter((s: any) => s.title !== 'CODE DETAILS & ANALYSIS');
  }, [content]);

  const filteredSections = fileSections.filter((s: any) => 
    s.title.toLowerCase().includes(filter.toLowerCase())
  );

  const activeSection = filteredSections[selectedFileIndex];
  
  // Lookup source file from fileMap
  const sourceFile: ProcessedFile | undefined = activeSection ? fileMap[activeSection.title] : undefined;
  
  // Calculate Freshness
  const [isFresh, setIsFresh] = useState<boolean | null>(null);
  
  useEffect(() => {
     const checkFreshness = async () => {
         if (sourceFile) {
             const currentHash = await generateContentHash(sourceFile.content);
             setIsFresh(sourceFile.metadata.contentHash === currentHash);
         }
     };
     checkFreshness();
  }, [sourceFile]);

  // Derive References (Inferred from Graph)
  const references = useMemo(() => {
      if (!activeSection) return { importedBy: [], uses: [] };
      const filePath = activeSection.title;
      // Reverse lookup in KnowledgeGraph
      const importedBy = Object.values(knowledgeGraph as Record<string, CodeSymbol>)
          .filter((s: CodeSymbol) => s.filePath !== filePath && s.relationships.calls.some(id => id.startsWith(filePath)))
          .map((s: CodeSymbol) => s.filePath)
          .filter((v, i, a) => a.indexOf(v) === i); // Unique

      return { importedBy };
  }, [activeSection, knowledgeGraph]);

  if (fileSections.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
           <Code className="w-16 h-16 mb-4 opacity-20" />
           <p>هنوز تحلیلی برای کدها تولید نشده است.</p>
        </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-220px)] bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
        {/* Sidebar List */}
        <div className="w-64 shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-white/50 backdrop-blur">
                <input 
                    type="text" 
                    placeholder="جستجو..." 
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-200 outline-none"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredSections.map((section: any, idx: number) => {
                   const isActive = idx === selectedFileIndex;
                   const fileName = section.title.split('/').pop();
                   return (
                     <button
                       key={idx}
                       onClick={() => setSelectedFileIndex(idx)}
                       className={`w-full text-right p-3 rounded-lg transition-all flex items-center gap-3 ${
                           isActive ? 'bg-brand-500 text-white shadow-md' : 'hover:bg-white text-slate-600'
                       }`}
                     >
                        <FileCode2 className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold truncate dir-ltr">{fileName}</span>
                     </button>
                   );
                })}
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            {activeSection && (
                <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-10">
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-sm font-bold text-slate-700 dir-ltr">{activeSection.title}</span>
                        {isFresh !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${isFresh ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isFresh ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                {isFresh ? 'Up to date' : 'Outdated'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 rounded-lg p-1 mr-4">
                            <button onClick={() => setViewMode('analysis')} className={`p-1.5 rounded-md ${viewMode === 'analysis' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400'}`} title="Analysis Only"><BookOpen className="w-4 h-4"/></button>
                            <button onClick={() => setViewMode('split')} className={`p-1.5 rounded-md ${viewMode === 'split' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400'}`} title="Split View"><SplitSquareHorizontal className="w-4 h-4"/></button>
                            <button onClick={() => setViewMode('code')} className={`p-1.5 rounded-md ${viewMode === 'code' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400'}`} title="Code Only"><Code className="w-4 h-4"/></button>
                        </div>
                        <button 
                            onClick={() => onReanalyze(activeSection.title)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold transition-colors"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" /> Re-analyze
                        </button>
                    </div>
                </div>
            )}

            {/* Split Panes */}
            {activeSection ? (
                <div className="flex-1 flex overflow-hidden">
                    {/* ANALYSIS PANE */}
                    {(viewMode === 'split' || viewMode === 'analysis') && (
                        <div className={`flex-1 overflow-y-auto custom-scrollbar p-8 ${viewMode === 'split' ? 'border-l border-slate-200' : ''}`}>
                             <div className="prose prose-slate max-w-none dir-rtl mb-12">
                                <MarkdownRenderer 
                                    content={activeSection.content} 
                                    knowledgeGraph={knowledgeGraph}
                                    sectionId={`code-${activeSection.title}`} 
                                    onSave={onSave}
                                    isEditable={true}
                                    onAskAI={onAskAI}
                                    showTOC={false} 
                                />
                             </div>
                             
                             {/* Back-References Section */}
                             {references.importedBy.length > 0 && (
                                 <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                     <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                         <Link2 className="w-4 h-4"/> ارجاعات (References)
                                     </h4>
                                     <p className="text-xs text-slate-500 mb-2">این فایل در فایل‌های زیر استفاده شده است:</p>
                                     <div className="flex flex-wrap gap-2">
                                         {references.importedBy.map((refPath: string) => (
                                             <span key={refPath} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600 dir-ltr">
                                                 {refPath}
                                             </span>
                                         ))}
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}

                    {/* SOURCE CODE PANE */}
                    {(viewMode === 'split' || viewMode === 'code') && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1E293B] text-slate-300 p-0 relative">
                            <div className="sticky top-0 left-0 right-0 bg-[#0F172A] px-4 py-2 text-[10px] font-mono text-slate-500 border-b border-slate-700 flex justify-between z-10">
                                <span>SOURCE CODE</span>
                                <span>{sourceFile?.lines} Lines</span>
                            </div>
                            <pre className="p-6 text-xs font-mono leading-relaxed pointer-events-none">
                                {sourceFile ? sourceFile.content : '// Source code not available in memory.'}
                            </pre>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <p>فایلی انتخاب نشده است.</p>
                </div>
            )}
        </div>
    </div>
  );
};

// --- NEW COMPONENT: Bento Dashboard ---
const BentoDashboard = ({ stats, docParts, knowledgeGraph, archViolations, fileMap }: any) => {
    const totalFiles = fileMap ? Object.keys(fileMap).length : 0;
    const totalSymbols = knowledgeGraph ? Object.keys(knowledgeGraph).length : 0;
    const docKeys = ['root', 'arch', 'dataFlow', 'useCase', 'erd', 'api', 'sequence', 'code'];
    const generatedCount = docKeys.filter(k => docParts[k]).length;
    const progress = Math.round((generatedCount / docKeys.length) * 100);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. Welcome & Progress */}
            <div className="md:col-span-2 bg-gradient-to-br from-brand-600 to-brand-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-brand-900/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black mb-2">داشبورد وضعیت پروژه</h3>
                    <p className="text-brand-100 mb-8 opacity-90">گزارش لحظه‌ای از تحلیل کد و تولید مستندات</p>
                    
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-70">پیشرفت مستندات</span>
                        <span className="text-2xl font-black">{progress}%</span>
                    </div>
                    <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                        <div className="h-full bg-white transition-all duration-1000 ease-out relative" style={{ width: `${progress}%` }}>
                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-white flex flex-col justify-center">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">فایل‌های پردازش شده</div>
                         <div className="text-2xl font-black text-slate-700">{totalFiles}</div>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">نمادهای کد</div>
                         <div className="text-2xl font-black text-slate-700">{totalSymbols}</div>
                     </div>
                     <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                         <div className="text-red-400 text-[10px] font-bold uppercase mb-1">تداخل معماری</div>
                         <div className="text-2xl font-black text-red-600">{archViolations ? archViolations.length : 0}</div>
                     </div>
                     <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                         <div className="text-emerald-400 text-[10px] font-bold uppercase mb-1">بخش‌های تکمیل شده</div>
                         <div className="text-2xl font-black text-emerald-600">{generatedCount} / {docKeys.length}</div>
                     </div>
                 </div>
            </div>

            {/* 3. Language Stats */}
            <div className="md:col-span-1 bg-white rounded-[2.5rem] p-8 shadow-soft border border-white">
                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-brand-500" />
                    توزیع زبان‌های برنامه نویسی
                </h4>
                <div className="space-y-4">
                    {stats && stats.slice(0, 5).map((stat: any, i: number) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5 dir-ltr">
                                <span>{stat.lang}</span>
                                <span>{Math.round(stat.percent)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full" 
                                    style={{ width: `${stat.percent}%`, backgroundColor: stat.color || '#cbd5e1' }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {stats && stats.length === 0 && <div className="text-slate-400 text-sm text-center py-4">داده‌ای یافت نشد</div>}
                </div>
            </div>

            {/* 4. Modules / Doc Parts Status */}
            <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-soft border border-white">
                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-500" />
                    وضعیت ماژول‌های مستندات
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {docKeys.map((key) => {
                        const isDone = !!docParts[key];
                        return (
                            <div key={key} className={`p-4 rounded-2xl border ${isDone ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-60'} transition-all`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
                                    <span className={`text-xs font-bold uppercase ${isDone ? 'text-emerald-700' : 'text-slate-500'}`}>{key}</span>
                                </div>
                                <div className={`h-1 rounded-full ${isDone ? 'bg-emerald-200' : 'bg-slate-200'}`}></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const BrowserGenerator: React.FC<BrowserGeneratorProps> = ({ config }) => {
  const [inputType, setInputType] = useState<'local' | 'github'>('local');
  const [files, setFiles] = useState<FileList | null>(null);
  const [scanStats, setScanStats] = useState<{ total: number, valid: number } | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  
  const [docLevels, setDocLevels] = useState({
    root: true, 
    code: true, 
    dataFlow: true,
    useCase: true,
    arch: true, 
    sequence: true, 
    api: true, 
    erd: true, 
    classDiagram: true, 
    infra: true    
  });

  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [isHudOpen, setIsHudOpen] = useState(true);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const vectorStoreRef = useRef<LocalVectorStore | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { logs, isProcessing, error, dismissError, progress, generatedDoc, hasContext, processRepository, stats, knowledgeGraph, docParts, businessRules, archViolations, zombieFiles, currentFile, saveManualOverride, fileMap, reanalyzeFile, importSession } = useRepoProcessor();
  
  const { chatMessages, chatInput, setChatInput, isChatLoading, isRetrieving, handleSendMessage } = useChat(
      config, 
      vectorStoreRef, 
      hasContext, 
      knowledgeGraph, 
      docParts
  );

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (isProcessing) setIsHudOpen(true);
  }, [isProcessing]);

  const handleStartProcessing = async () => {
    await processRepository({ config, inputType, files, githubUrl, docLevels, vectorStoreRef });
    setActiveSection('dashboard');
  };

  const handleDirectorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       const fileList = e.target.files;
       let validCount = 0;
       
       Array.from(fileList).forEach((file: any) => {
           const filePath = file.webkitRelativePath || file.name;
           const pathParts = filePath.split('/');
           const hasIgnoredDir = pathParts.some(part => IGNORED_DIRS.has(part));
           const extension = '.' + file.name.split('.').pop()?.toLowerCase();
           
           if (!hasIgnoredDir && ALLOWED_EXTENSIONS.has(extension)) {
               validCount++;
           }
       });

       setFiles(fileList);
       setScanStats({ total: fileList.length, valid: validCount });
    }
  };

  const handleAskAI = (text: string) => {
      setChatInput(text);
      setIsChatOpen(true);
  };

  const downloadMarkdown = () => {
    const order = ['root', 'arch', 'dataFlow', 'useCase', 'erd', 'api', 'sequence', 'infra', 'class', 'code'];
    let combinedMarkdown = '';
    order.forEach(key => {
        if (docParts[key]) {
            let title = key.toUpperCase();
            if (key === 'root') title = "INTRODUCTION";
            if (key === 'arch') title = "SYSTEM ARCHITECTURE";
            if (key === 'code') title = "CODE DETAILS & ANALYSIS";
            combinedMarkdown += `\n\n# ${title}\n\n${docParts[key]}\n\n---\n`;
        }
    });
    const blob = new Blob([combinedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DOCUMENTATION.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = {
        logs, generatedDoc, docParts, stats, knowledgeGraph, businessRules, archViolations, zombieFiles, fileMap,
        timestamp: Date.now()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rayan-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            importSession(json);
            setActiveSection('dashboard');
        } catch (err) {
            console.error(err);
            alert('Invalid JSON file');
        }
    };
    reader.readAsText(file);
    // Reset value to allow re-importing same file
    e.target.value = '';
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const dependencyGraphMermaid = useMemo(() => {
    if (!knowledgeGraph || Object.keys(knowledgeGraph).length === 0) return '';
    const allSymbols = Object.values(knowledgeGraph) as CodeSymbol[];
    const sortedSymbols = [...allSymbols].sort((a, b) => (b.relationships.calledBy.length) - (a.relationships.calledBy.length));
    const topSymbols = sortedSymbols.slice(0, 80);
    const topSymbolIds = new Set(topSymbols.map(s => s.id));
    const nodes = new Set<string>();
    const edges = new Set<string>();
    topSymbols.forEach((sym: CodeSymbol) => {
        const cleanId = sym.id.replace(/[^a-zA-Z0-9]/g, '_');
        nodes.add(`${cleanId}["${sym.name}"]`);
        sym.relationships.calls.forEach(targetId => {
            if (topSymbolIds.has(targetId)) {
                edges.add(`${cleanId} --> ${targetId.replace(/[^a-zA-Z0-9_]/g, '_')}`);
            }
        });
    });
    return `graph TD\n${Array.from(nodes).join('\n')}\n${Array.from(edges).join('\n')}`;
  }, [knowledgeGraph]);

  const NavItem = ({ icon: Icon, label, active, onClick, collapsed, alert, isPrimary }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 group relative my-1.5 ${
        active 
          ? 'bg-gradient-to-tr from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30 ring-1 ring-white/20' 
          : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm'
      } ${isPrimary ? 'mb-6 py-4' : ''}`}
      title={collapsed ? label : ''}
    >
      <div className={`p-2 rounded-xl transition-colors ${
          active 
          ? 'bg-white/20 text-white' 
          : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600'
      }`}>
         <Icon className={`w-5 h-5`} />
      </div>
      {!collapsed && (
          <div className="flex-1 flex items-center justify-between">
            <span className={`font-bold text-sm tracking-wide ${active ? 'text-white' : ''}`}>{label}</span>
             {alert && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>}
          </div>
      )}
    </button>
  );

  // --- FLOATING HUD ---
  const ProcessingHUD = () => (
    <div className={`fixed bottom-6 left-6 z-[50] transition-all duration-300 ease-in-out bg-[#0B0F19] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${isHudOpen ? 'w-[450px]' : 'w-72'} ${error ? 'border-red-500/50 shadow-red-900/20' : 'border-slate-800 shadow-black/50'}`}>
       <div 
         className={`p-4 flex items-center justify-between cursor-pointer ${isHudOpen ? 'bg-slate-900/50 border-b border-slate-800' : 'bg-[#0B0F19]'}`}
         onClick={() => setIsHudOpen(!isHudOpen)}
       >
          <div className="flex items-center gap-3">
             {error ? (
                 <Skull className="w-5 h-5 text-red-500 animate-pulse" />
             ) : (
                 <div className="relative">
                    <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-brand-500 rounded-full animate-ping opacity-20"></div>
                    </div>
                 </div>
             )}
             <div className="flex flex-col text-left dir-ltr">
                 <span className={`text-xs font-bold font-mono ${error ? 'text-red-400' : 'text-white'}`}>
                     {error ? 'Process Failed' : `Processing... ${Math.round(progress)}%`}
                 </span>
                 {!isHudOpen && !error && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{currentFile}</span>
                 )}
             </div>
          </div>
          <button className="text-slate-500 hover:text-white transition-colors">
              {isHudOpen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
       </div>
       {isHudOpen && (
          <div className="p-5 bg-[#0B0F19]/95 backdrop-blur text-left dir-ltr">
             {error ? (
                <div className="space-y-4">
                   <div className="text-red-400 text-xs leading-relaxed bg-red-950/30 p-3 rounded-xl border border-red-900/50">
                     {error}
                   </div>
                   <button onClick={dismissError} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors border border-slate-700 flex items-center justify-center gap-2">
                     <RotateCw className="w-3 h-3" /> Dismiss & Continue
                   </button>
                </div>
             ) : (
                <div className="space-y-4">
                   <div>
                       <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider font-bold">
                          <span>Current Action</span>
                          <span>{Math.round(progress)}%</span>
                       </div>
                       <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                          <div 
                            className="h-full bg-gradient-to-r from-brand-600 to-cyan-400 transition-all duration-300 relative" 
                            style={{ width: `${progress}%` }}
                          >
                             <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                          </div>
                       </div>
                       <div className="mt-2 text-[10px] font-mono text-cyan-400 truncate bg-cyan-950/20 py-1 px-2 rounded border border-cyan-900/30">
                          {currentFile || 'Initializing engine...'}
                       </div>
                   </div>
                   <div className="bg-[#05080e] rounded-xl border border-slate-800 h-40 flex flex-col relative overflow-hidden">
                       <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#05080e] to-transparent z-10"></div>
                       <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar flex flex-col-reverse">
                           {logs.slice().reverse().map((log, i) => (
                             <div key={i} className={`flex gap-2 text-[10px] font-mono border-l-2 pl-2 ${log.type === 'error' ? 'text-red-400 border-red-500' : log.type === 'success' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-slate-800'}`}>
                                <span className="break-all">{log.message}</span>
                             </div>
                           ))}
                       </div>
                       <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#05080e] to-transparent z-10"></div>
                   </div>
                </div>
             )}
          </div>
       )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-100/50 overflow-hidden rounded-[2.5rem] shadow-glass border border-white/60 relative mx-4 mb-4 backdrop-blur-xl">
        {/* Hidden Import Input */}
        <input 
          type="file" 
          ref={importInputRef} 
          style={{ display: 'none' }} 
          accept=".json" 
          onChange={handleImportJSON} 
        />

        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-white/40 backdrop-blur-xl border-l border-white/40 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative`}>
            <div className="p-8 pb-4 flex items-center justify-between">
                {isSidebarOpen && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="font-black text-2xl text-slate-800 tracking-tight">تحلیل سیستم</h2>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">نسخه هوشمند ۳.۰</p>
                    </div>
                )}
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-700 transition-all shadow-sm border border-transparent hover:border-slate-100 group">
                    {isSidebarOpen ? <ChevronRight className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"/> : <ChevronLeft className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"/>}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-1">
                <NavItem icon={LayoutDashboard} label="داشبورد وضعیت" active={activeSection === 'dashboard'} onClick={() => setActiveSection('dashboard')} collapsed={!isSidebarOpen} isPrimary={true} />
                {docParts.root && <NavItem icon={FileIcon} label="معرفی (README)" active={activeSection === 'root'} onClick={() => setActiveSection('root')} collapsed={!isSidebarOpen} />}
                
                {isSidebarOpen && <div className="text-[11px] font-extrabold text-slate-400 mt-8 mb-4 px-2 flex items-center gap-3"><span>نمودارهای کلان</span><div className="h-px bg-slate-200 flex-1"></div></div>}
                {!isSidebarOpen && <div className="w-8 h-px bg-slate-200 mx-auto my-4"></div>}
                
                {docParts.arch && <NavItem icon={Layers} label="معماری سیستم" active={activeSection === 'arch'} onClick={() => setActiveSection('arch')} collapsed={!isSidebarOpen} />}
                {docParts.dataFlow && <NavItem icon={Workflow} label="جریان داده‌ها" active={activeSection === 'dataFlow'} onClick={() => setActiveSection('dataFlow')} collapsed={!isSidebarOpen} />}
                {docParts.useCase && <NavItem icon={Users} label="موارد کاربرد" active={activeSection === 'useCase'} onClick={() => setActiveSection('useCase')} collapsed={!isSidebarOpen} />}
                {docParts.erd && <NavItem icon={Database} label="دیتابیس (ERD)" active={activeSection === 'erd'} onClick={() => setActiveSection('erd')} collapsed={!isSidebarOpen} />}
                {docParts.infra && <NavItem icon={Server} label="زیرساخت" active={activeSection === 'infra'} onClick={() => setActiveSection('infra')} collapsed={!isSidebarOpen} />}

                {isSidebarOpen && <div className="text-[11px] font-extrabold text-slate-400 mt-8 mb-4 px-2 flex items-center gap-3"><span>جریان و منطق</span><div className="h-px bg-slate-200 flex-1"></div></div>}
                {!isSidebarOpen && <div className="w-8 h-px bg-slate-200 mx-auto my-4"></div>}

                {docParts.sequence && <NavItem icon={GitMerge} label="نمودار توالی" active={activeSection === 'sequence'} onClick={() => setActiveSection('sequence')} collapsed={!isSidebarOpen} />}
                {docParts.api && <NavItem icon={ListChecks} label="API Endpoints" active={activeSection === 'api'} onClick={() => setActiveSection('api')} collapsed={!isSidebarOpen} />}
                {docParts.class && <NavItem icon={LayoutTemplate} label="نمودار کلاس" active={activeSection === 'class'} onClick={() => setActiveSection('class')} collapsed={!isSidebarOpen} />}
                
                {isSidebarOpen && <div className="text-[11px] font-extrabold text-slate-400 mt-8 mb-4 px-2 flex items-center gap-3"><span>جزئیات فنی</span><div className="h-px bg-slate-200 flex-1"></div></div>}
                {!isSidebarOpen && <div className="w-8 h-px bg-slate-200 mx-auto my-4"></div>}

                {docParts.code && <NavItem icon={Code} label="تحلیل کدها" active={activeSection === 'code'} onClick={() => setActiveSection('code')} collapsed={!isSidebarOpen} />}
                <NavItem icon={ShieldAlert} label="سلامت کد" active={activeSection === 'health'} onClick={() => setActiveSection('health')} collapsed={!isSidebarOpen} alert={archViolations.length > 0} />
                
                {knowledgeGraph && Object.keys(knowledgeGraph).length > 0 && <NavItem icon={Activity} label="اکوسیستم زنده" active={activeSection === 'live'} onClick={() => setActiveSection('live')} collapsed={!isSidebarOpen} />}
                {knowledgeGraph && <NavItem icon={BrainCircuit} label="گراف استاتیک" active={activeSection === 'graph'} onClick={() => setActiveSection('graph')} collapsed={!isSidebarOpen} />}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white/30 backdrop-blur-sm space-y-2">
               {generatedDoc && (
                   <button onClick={downloadMarkdown} className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 hover:shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95">
                      <Download className="w-4 h-4 group-hover:animate-bounce" /> 
                      {isSidebarOpen && <span>دانلود Markdown</span>}
                   </button>
               )}
               {/* Import / Export Session Buttons */}
               {isSidebarOpen ? (
                   <div className="grid grid-cols-2 gap-2">
                       <button onClick={handleExportJSON} className="py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-all flex items-center justify-center gap-1.5" title="Export Session">
                           <Save className="w-3.5 h-3.5" /> <span>ذخیره</span>
                       </button>
                       <button onClick={() => importInputRef.current?.click()} className="py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-all flex items-center justify-center gap-1.5" title="Import Session">
                           <Upload className="w-3.5 h-3.5" /> <span>بازیابی</span>
                       </button>
                   </div>
               ) : (
                    <div className="flex flex-col gap-2">
                        <button onClick={handleExportJSON} className="p-2.5 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all flex justify-center" title="Export Session"><Save className="w-4 h-4" /></button>
                        <button onClick={() => importInputRef.current?.click()} className="p-2.5 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all flex justify-center" title="Import Session"><Upload className="w-4 h-4" /></button>
                    </div>
               )}
            </div>
        </aside>

        <main className="flex-1 relative overflow-hidden flex flex-col">
            <header className="h-20 bg-white/40 backdrop-blur-md flex items-center px-8 justify-between z-10 border-b border-white/50">
                <div>
                   <h2 className="font-extrabold text-slate-800 text-xl flex items-center gap-2 capitalize">
                     {activeSection === 'dashboard' ? 'نمای کلی' : activeSection === 'live' ? 'اکوسیستم زنده کد' : activeSection === 'health' ? 'سلامت و کیفیت کد' : activeSection}
                   </h2>
                   <p className="text-xs text-slate-400 font-medium mt-1">مشاهده و تحلیل مستندات تولید شده</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                {(isProcessing || error) && <ProcessingHUD />}
                
                {!generatedDoc && !hasContext && !isProcessing && !error ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                        {/* Landing Content ... */}
                        <div className="w-28 h-28 bg-white shadow-xl rounded-[2rem] flex items-center justify-center relative group">
                           <div className="absolute inset-0 bg-gradient-to-tr from-brand-100 to-transparent rounded-[2rem] opacity-50 group-hover:scale-105 transition-transform duration-500"></div>
                           <Box className="w-14 h-14 text-brand-600 relative z-10 group-hover:scale-110 transition-transform duration-300"/>
                        </div>
                        <div>
                            <h2 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">تحلیل عمیق کد با <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-pink">رایان</span></h2>
                            <p className="text-slate-500 leading-relaxed text-lg font-medium">مستندات هوشمند، تحلیل معماری و چت با پروژه<br/><span className="text-sm opacity-70">با قدرت پردازش محلی Ollama</span></p>
                        </div>
                        <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white w-full max-w-lg mx-auto">
                            <div className="flex gap-2 p-1 bg-slate-100/80 backdrop-blur rounded-3xl mb-2">
                                <button onClick={() => setInputType('local')} className={`flex-1 py-3 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 ${inputType === 'local' ? 'bg-white text-brand-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/50'}`}><Folder className={`w-4 h-4 ${inputType === 'local' ? 'text-brand-500' : 'text-slate-400'}`} />پوشه محلی</button>
                                <button onClick={() => setInputType('github')} className={`flex-1 py-3 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 ${inputType === 'github' ? 'bg-white text-brand-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/50'}`}><Github className={`w-4 h-4 ${inputType === 'github' ? 'text-brand-500' : 'text-slate-400'}`} />گیت‌هاب</button>
                            </div>
                            <div className="p-6 pt-2">
                                {inputType === 'local' ? (
                                    <div className="relative group cursor-pointer">
                                        <input type="file" 
                                          // @ts-ignore
                                          webkitdirectory="" directory="" onChange={handleDirectorySelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className={`w-full p-10 border-2 border-dashed rounded-[2rem] text-center transition-all duration-300 flex flex-col items-center gap-4 ${files ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200 group-hover:border-brand-300 group-hover:bg-brand-50/10'}`}>
                                            {files && scanStats ? (
                                                <>
                                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center mb-2"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
                                                    <div><span className="block text-lg font-black text-emerald-800 mb-1">{scanStats.total.toLocaleString()} فایل</span><span className="text-sm text-emerald-600 font-medium">{scanStats.valid.toLocaleString()} فایل کد معتبر برای پردازش</span></div>
                                                    <div className="text-[10px] font-bold text-emerald-400 bg-emerald-100 px-3 py-1 rounded-full mt-2">برای تغییر مسیر کلیک کنید</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300"><Upload className="w-7 h-7 text-brand-500" /></div>
                                                    <div><span className="block text-base font-bold text-slate-700 mb-1">انتخاب پوشه پروژه</span><span className="text-xs text-slate-400">فقط فایل‌های متنی (JS, TS, PY, etc)</span></div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative py-4">
                                        <Github className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                        <input type="text" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="username/repo" className="w-full h-16 bg-slate-50 rounded-2xl pr-14 pl-4 text-right dir-ltr outline-none border-2 border-slate-100 focus:border-brand-400 focus:bg-white transition-all font-mono text-sm placeholder:text-slate-300 text-slate-600 shadow-inner" />
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">Public Only</div>
                                    </div>
                                )}
                                <div className="flex gap-3 mt-6">
                                     <button onClick={() => importInputRef.current?.click()} className="py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2" title="Load Previous Session">
                                        <Upload className="w-5 h-5" />
                                     </button>
                                     <button onClick={handleStartProcessing} disabled={isProcessing || (inputType === 'local' && !files) || (inputType === 'github' && !githubUrl)} className="flex-1 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                                        <Sparkles className="w-5 h-5" />شروع تحلیل هوشمند
                                     </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-[1400px] mx-auto pb-32">
                        {activeSection === 'dashboard' ? (
                            <BentoDashboard 
                                stats={stats} 
                                docParts={docParts} 
                                knowledgeGraph={knowledgeGraph} 
                                archViolations={archViolations} 
                                fileMap={fileMap} 
                            />
                        ) : 
                         activeSection === 'code' ? (
                             <CodeAnalysisViewer 
                                content={docParts.code} 
                                knowledgeGraph={knowledgeGraph} 
                                onSave={saveManualOverride}
                                fileMap={fileMap}
                                onReanalyze={(path: string) => reanalyzeFile(config, path)}
                                onAskAI={handleAskAI}
                             />
                         ) : 
                         activeSection === 'graph' ? (
                            <div className="bg-white rounded-[2.5rem] p-4 shadow-soft border border-white h-[700px]">
                                <MermaidRenderer code={dependencyGraphMermaid} />
                            </div>
                         ) :
                         activeSection === 'live' ? (
                             <div className="h-[750px] animate-in fade-in duration-700">
                                 <LiveVisualization 
                                    knowledgeGraph={knowledgeGraph} 
                                    archViolations={archViolations}
                                    zombieFiles={zombieFiles}
                                 />
                             </div>
                         ) :
                         activeSection === 'health' ? (
                             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                 
                                 {/* 1. Summary Cards */}
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                     <div className={`p-6 rounded-3xl border shadow-sm ${archViolations.length > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                         <div className="flex justify-between items-start mb-2">
                                             <ShieldAlert className="w-8 h-8 opacity-80" />
                                             <span className="text-2xl font-black">{archViolations.length}</span>
                                         </div>
                                         <div className="text-xs font-bold uppercase tracking-wider">تداخل معماری</div>
                                     </div>

                                     <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-slate-700">
                                         <div className="flex justify-between items-start mb-2">
                                             <ZapIcon className="w-8 h-8 text-purple-400" />
                                             {/* Total Smart Audit Issues */}
                                             <span className="text-2xl font-black">
                                                 {(Object.values(fileMap) as ProcessedFile[]).reduce((acc, f) => acc + (f.metadata.issues?.length || 0), 0)}
                                             </span>
                                         </div>
                                         <div className="text-xs font-bold uppercase tracking-wider text-slate-400">باگ/امنیت</div>
                                     </div>

                                     <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-slate-700">
                                         <div className="flex justify-between items-start mb-2">
                                             <Activity className="w-8 h-8 text-orange-400" />
                                             {/* Calculate Average Complexity */}
                                             <span className="text-2xl font-black">
                                                 {Math.round((Object.values(fileMap) as ProcessedFile[]).reduce((acc, f) => acc + (f.metadata.metrics?.complexity || 0), 0) / (Object.keys(fileMap).length || 1))}
                                             </span>
                                         </div>
                                         <div className="text-xs font-bold uppercase tracking-wider text-slate-400">میانگین پیچیدگی</div>
                                     </div>

                                     <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-slate-700">
                                         <div className="flex justify-between items-start mb-2">
                                             <ScrollText className="w-8 h-8 text-blue-400" />
                                             <span className="text-2xl font-black">
                                                 {Math.round((Object.values(fileMap) as ProcessedFile[]).reduce((acc, f) => acc + (f.metadata.metrics?.commentRatio || 0), 0) / (Object.keys(fileMap).length || 1))}%
                                             </span>
                                         </div>
                                         <div className="text-xs font-bold uppercase tracking-wider text-slate-400">پوشش مستندات</div>
                                     </div>
                                 </div>

                                 {/* 2. Critical Violations */}
                                 {archViolations.length > 0 && (
                                     <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-red-100">
                                         <h3 className="font-bold text-red-600 mb-6 flex items-center gap-2">
                                             <ShieldAlert className="w-5 h-5" /> تداخل‌های معماری بحرانی
                                         </h3>
                                         <div className="space-y-4">
                                             {archViolations.map((v, i) => (
                                                 <div key={i} className="flex gap-4 p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                                                     <div className="shrink-0 w-1 bg-red-400 rounded-full"></div>
                                                     <div>
                                                         <div className="font-bold text-slate-800 text-sm mb-1">{v.rule}</div>
                                                         <div className="text-xs text-slate-500 mb-2">{v.description}</div>
                                                         <div className="inline-block bg-white px-3 py-1 rounded-lg text-[10px] font-mono text-red-500 border border-red-100 dir-ltr">
                                                             {v.filePath}
                                                         </div>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* 3. Zombie Files */}
                                 {zombieFiles.length > 0 && (
                                     <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-slate-100">
                                         <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                             <Skull className="w-5 h-5 text-slate-400" /> کدهای مرده (استفاده نشده)
                                         </h3>
                                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                             {zombieFiles.map((file, i) => (
                                                 <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-500 border border-slate-100 dir-ltr hover:bg-slate-100 transition-colors">
                                                     <FileIcon className="w-3.5 h-3.5 opacity-50" />
                                                     <span className="truncate">{file}</span>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* 4. Complexity Hotspots */}
                                 <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-slate-100">
                                     <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                         <Activity className="w-5 h-5 text-orange-500" /> پیچیده‌ترین فایل‌ها (نیاز به ریفکتور)
                                     </h3>
                                     <div className="space-y-3">
                                         {(Object.values(fileMap) as ProcessedFile[])
                                             .sort((a, b) => (b.metadata.metrics?.complexity || 0) - (a.metadata.metrics?.complexity || 0))
                                             .slice(0, 5)
                                             .map((file, i) => (
                                                 <div key={i} className="flex items-center justify-between p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                                                     <div className="flex items-center gap-3">
                                                         <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                                                             {i + 1}
                                                         </div>
                                                         <div>
                                                             <div className="font-bold text-slate-700 text-sm dir-ltr">{file.path.split('/').pop()}</div>
                                                             <div className="text-[10px] text-slate-400 dir-ltr">{file.path}</div>
                                                         </div>
                                                     </div>
                                                     <div className="flex flex-col items-end">
                                                         <span className="text-lg font-black text-orange-600">{file.metadata.metrics?.complexity || 0}</span>
                                                         <span className="text-[10px] text-orange-400 font-bold uppercase">Complexity</span>
                                                     </div>
                                                 </div>
                                             ))}
                                     </div>
                                 </div>

                                 {/* 5. Smart Audit Issues (NEW) */}
                                 {(Object.values(fileMap) as ProcessedFile[]).filter(f => f.metadata.issues && f.metadata.issues.length > 0).length > 0 && (
                                     <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-purple-100 col-span-full">
                                         <h3 className="font-bold text-purple-700 mb-6 flex items-center gap-2">
                                             <Search className="w-5 h-5" /> مشکلات شناسایی شده (Smart Audit)
                                         </h3>
                                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                             {(Object.values(fileMap) as ProcessedFile[])
                                                 .filter(f => f.metadata.issues && f.metadata.issues.length > 0)
                                                 .map(file => (
                                                 <div key={file.path} className="border border-slate-100 rounded-2xl overflow-hidden">
                                                     <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                                         <span className="text-xs font-bold text-slate-700 dir-ltr">{file.path}</span>
                                                         <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{file.metadata.issues?.length} Issues</span>
                                                     </div>
                                                     <FileIssuesList issues={file.metadata.issues || []} />
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}
                             </div>
                         ) : (
                             <div className="bg-white rounded-[2.5rem] p-12 shadow-soft border border-white prose prose-slate max-w-none dir-rtl prose-headings:font-extrabold prose-p:text-slate-600 prose-img:rounded-3xl">
                                 {docParts[activeSection] ? (
                                    <>
                                     <MarkdownRenderer 
                                        content={docParts[activeSection]} 
                                        knowledgeGraph={knowledgeGraph}
                                        sectionId={activeSection}
                                        onSave={saveManualOverride}
                                        isEditable={true}
                                        onAskAI={handleAskAI}
                                        showTOC={true} 
                                     />
                                     {activeSection === 'root' && fileMap && Object.keys(fileMap).length > 0 && (
                                         <ProjectStructureVisualizer fileMap={fileMap} />
                                     )}
                                    </>
                                 ) : <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                     <Loader2 className="w-10 h-10 animate-spin opacity-50"/>
                                     در حال آماده‌سازی محتوا...
                                 </div>}
                             </div>
                         )}
                    </div>
                )}
            </div>

            {/* CHAT WINDOW */}
            <div className={`fixed top-20 left-10 bottom-10 w-[600px] max-w-[90vw] bg-white/95 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] border border-white flex flex-col z-50 transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) ${isChatOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-accent-pink text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                                <Bot className="w-8 h-8"/>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                            <span className="font-extrabold text-slate-800 block text-xl">رایان</span>
                            <span className="text-xs text-slate-500 font-medium">دستیار هوشمند پروژه</span>
                        </div>
                    </div>
                    <button onClick={() => setIsChatOpen(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6"/></button>
                </div>
                
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                    {chatMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-6 rounded-[2rem] text-sm leading-7 shadow-sm ${
                                m.role === 'user' 
                                  ? 'bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-br-none shadow-brand-900/10' 
                                  : 'bg-white text-slate-700 rounded-bl-none border border-slate-100 shadow-md'
                            }`}>
                                {m.role === 'assistant' ? (
                                    <div className="prose prose-sm prose-slate max-w-none dir-rtl prose-p:my-2 prose-headings:my-3 prose-headings:text-slate-800 prose-a:text-brand-600">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                a: ({node, ...props}) => <span className="text-brand-600 font-bold cursor-pointer underline decoration-brand-200 underline-offset-4" {...props} />,
                                                code: ChatCodeBlock,
                                                p: ({children}) => <div className="text-slate-600 leading-8 mb-4 text-justify dir-rtl">{children}</div>
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <span className="text-[15px] font-medium leading-loose">{m.content}</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white p-5 rounded-[2rem] rounded-bl-none border border-slate-100 flex items-center gap-3 shadow-sm">
                                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                                <span className="text-xs text-slate-500 font-bold animate-pulse">{isRetrieving ? 'جستجو در پایگاه دانش...' : 'نوشتن پاسخ...'}</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur">
                    <div className="relative">
                        <textarea 
                           value={chatInput} 
                           onChange={e => setChatInput(e.target.value)} 
                           onKeyDown={handleKeyDown} 
                           placeholder="سوال خود را بپرسید..." 
                           className="w-full p-5 bg-slate-50 rounded-3xl pr-16 resize-none h-20 outline-none border border-slate-200 focus:border-brand-400 focus:bg-white text-sm shadow-inner transition-all leading-relaxed" 
                        />
                        <button onClick={handleSendMessage} className="absolute left-3 top-3 bg-brand-600 text-white p-3.5 rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95">
                           <Send className="w-5 h-5 rotate-180"/>
                        </button>
                    </div>
                </div>
            </div>

            {!isChatOpen && (
                <button onClick={() => setIsChatOpen(true)} className="fixed bottom-8 left-8 w-16 h-16 bg-gradient-to-tr from-brand-600 to-brand-500 text-white rounded-full shadow-glow flex items-center justify-center hover:scale-110 transition-all z-40 group border-4 border-white/20">
                    <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform"/>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                </button>
            )}
        </main>
    </div>
  );
};

export default BrowserGenerator;
