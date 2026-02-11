
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MermaidRenderer from './MermaidRenderer';
import { CodeSymbol } from '../types';
import { ArrowRight, Code, MapPin, Edit, Save, X, FlaskConical, ExternalLink, MessageSquarePlus, ChevronRight, ChevronDown, List, Terminal, FileCode2, Copy, Check } from 'lucide-react';

interface WikiLinkProps {
  symbolName: string;
  children: React.ReactNode;
  knowledgeGraph: Record<string, CodeSymbol>;
}

const WikiLink: React.FC<WikiLinkProps> = ({ symbolName, children, knowledgeGraph }) => {
  const [isHovered, setIsHovered] = useState(false);
  const symbolEntry = (Object.values(knowledgeGraph) as CodeSymbol[]).find(s => s.name === symbolName);

  if (!symbolEntry) return <span className="text-slate-700 font-bold decoration-slate-300 underline decoration-dotted underline-offset-4">{children}</span>;

  const handleJump = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Jump to symbol:", symbolEntry.id);
  };

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button 
        onClick={handleJump}
        className="text-brand-600 font-extrabold cursor-pointer hover:text-brand-800 transition-colors inline-flex items-center gap-0.5 bg-brand-50 px-1.5 py-0.5 rounded-md border border-brand-100 hover:border-brand-300"
      >
        {children}
        <ExternalLink className="w-3 h-3 opacity-50" />
      </button>

      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-96 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 text-left dir-ltr p-5 animate-in zoom-in-95 duration-200 pointer-events-none ring-1 ring-black/50">
           <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-2 mb-1 uppercase tracking-wider">
                    <Code className="w-3 h-3" />
                    {symbolEntry.kind}
                </span>
                <span className="text-lg font-bold text-white block leading-none">{symbolEntry.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full">
                <MapPin className="w-3 h-3" />
                Line {symbolEntry.line}
              </span>
           </div>
           
           <div className="text-[10px] text-slate-400 mb-2 truncate font-mono">
              {symbolEntry.filePath}
           </div>

           {symbolEntry.relatedTests && symbolEntry.relatedTests.length > 0 && (
             <div className="mb-3 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
               <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mb-1">
                 <FlaskConical className="w-3 h-3" /> Verified by Tests:
               </div>
               <ul className="list-disc list-inside text-[10px] text-slate-300">
                  {symbolEntry.relatedTests.map(t => <li key={t}>{t.split(':').pop()}</li>)}
               </ul>
             </div>
           )}

           <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-cyan-500 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                <pre className="relative text-xs font-mono text-slate-300 overflow-x-auto custom-scrollbar max-h-48 p-3 bg-black/50 rounded-lg border border-white/5">
                    {symbolEntry.codeSnippet || 'Loading snippet...'}
                </pre>
           </div>
        </div>
      )}
    </span>
  );
};

// --- STICKY TABLE OF CONTENTS ---
interface HeaderItem {
  id: string;
  text: string;
  fullText?: string;
  level: number;
}

const TableOfContents = ({ headers }: { headers: HeaderItem[] }) => {
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveId(entry.target.id);
                }
            });
        }, { rootMargin: '-20% 0px -35% 0px' });

        headers.forEach(h => {
            const el = document.getElementById(h.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [headers]);

    if (headers.length === 0) return null;

    return (
        <div className="hidden lg:block w-64 shrink-0 sticky top-4 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar border-l border-slate-200 ml-8 pl-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <List className="w-4 h-4" /> فهرست مطالب
            </div>
            <ul className="space-y-1">
                {headers.map((h, i) => (
                    <li key={`${h.id}-${i}`} style={{ marginRight: `${(h.level - 1) * 12}px` }}>
                        <a 
                           href={`#${h.id}`}
                           title={h.fullText || h.text}
                           className={`block text-xs py-1.5 px-2 rounded-lg transition-all line-clamp-1 ${
                               activeId === h.id 
                               ? 'bg-brand-50 text-brand-700 font-bold border-r-2 border-brand-500' 
                               : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                           }`}
                        >
                            {h.text}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- COLLAPSIBLE SECTION ---
const CollapsibleSection = ({ children, ...props }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Attempt to find the summary element children to use as title
    let title = "جزئیات بیشتر";
    let content = children;

    // ReactMarkdown passes [summary, ...content] as children for <details>
    if (Array.isArray(children)) {
        const summaryElement = children.find((child: any) => child.key && child.key.startsWith('summary'));
        if (summaryElement) {
            title = summaryElement.props.children || title;
            content = children.filter((child: any) => child !== summaryElement);
        }
    }

    return (
        <div className="border border-slate-100 rounded-2xl mb-6 overflow-hidden bg-white shadow-sm">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    <h2 className="text-lg font-bold text-slate-800 m-0">{title}</h2>
                </div>
            </button>
            {isOpen && <div className="p-6 border-t border-slate-100">{content}</div>}
        </div>
    );
};

// --- CODE BLOCK RENDERER ---
const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const codeText = String(children).replace(/\n$/, '');
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : '';
    const isMermaid = lang === 'mermaid';
    
    const isSingleLine = !codeText.includes('\n');
    const isShortSnippet = isSingleLine && codeText.length < 80;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(codeText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!inline && isMermaid) {
        return <MermaidRenderer code={codeText} />;
    }

    if (inline) {
        return (
            <code className="bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-md text-sm font-mono border border-brand-100 align-middle" {...props}>
                {children}
            </code>
        );
    }

    if (isShortSnippet) {
        return (
            <div className="my-2 dir-ltr inline-block align-middle max-w-full">
                <div className="flex items-center gap-2 bg-[#1E293B] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm font-mono text-sm hover:border-brand-500/50 transition-colors group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <FileCode2 className="w-3.5 h-3.5 text-brand-400 opacity-70" />
                    <span>{children}</span>
                    <button onClick={handleCopy} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-white" title="Copy">
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="my-4 dir-ltr border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none ${isOpen ? 'bg-slate-100 border-b border-slate-200' : 'bg-white'}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-1 rounded-md transition-transform duration-200 ${isOpen ? 'rotate-90 bg-slate-200' : 'bg-slate-100 text-slate-400'}`}>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider flex items-center gap-2">
                             {lang || 'CODE'}
                             {isOpen && <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 rounded ml-2">Open</span>}
                        </span>
                        {!isOpen && <span className="text-[10px] text-slate-400 font-normal truncate max-w-[300px] mt-0.5">Click to view source ({codeText.length} chars)...</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <span className="text-[10px] text-slate-400 font-mono hidden sm:block bg-slate-50 px-2 py-1 rounded">
                        {codeText.split('\n').length} lines
                     </span>
                     <div className="h-4 w-px bg-slate-200 mx-1"></div>
                     <button 
                        onClick={handleCopy} 
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                        title="Copy Code"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="bg-[#1E293B] relative group animate-in slide-in-from-top-1 duration-200">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-50"></div>
                    <div className="overflow-x-auto custom-scrollbar">
                         <code className="block p-5 text-sm font-mono text-slate-300 leading-relaxed" {...props}>
                            {children}
                        </code>
                    </div>
                </div>
            )}
        </div>
    );
};

interface MarkdownRendererProps {
  content: string;
  knowledgeGraph?: Record<string, CodeSymbol>;
  sectionId?: string;
  onSave?: (id: string, newContent: string) => void;
  isEditable?: boolean;
  onAskAI?: (text: string) => void;
  showTOC?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, knowledgeGraph = {}, sectionId, onSave, isEditable = false, onAskAI, showTOC = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [selection, setSelection] = useState<{text: string, x: number, y: number} | null>(null);
  const [headers, setHeaders] = useState<HeaderItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parse Headers for TOC
    const lines = content.split('\n');
    const extractedHeaders: HeaderItem[] = [];
    lines.forEach(line => {
        const match = line.match(/^(#{1,3})\s+(.*)$/);
        if (match) {
            const level = match[1].length;
            const rawText = match[2].trim();
            const id = rawText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            // Smart Cleanup for TOC readability
            let displayText = rawText;
            if (displayText.includes('Flow Analysis:')) {
                const parts = displayText.split('Flow Analysis:');
                if (parts.length > 1) {
                    const path = parts[1].trim();
                    const filename = path.split('/').pop();
                    displayText = filename || path;
                }
            }
            
            extractedHeaders.push({ id, text: displayText, fullText: rawText, level });
        }
    });
    setHeaders(extractedHeaders);
  }, [content]);

  useEffect(() => {
    const handleSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 5 && containerRef.current && containerRef.current.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelection({
                text: sel.toString(),
                x: rect.left + (rect.width / 2),
                y: rect.top - 10
            });
        } else {
            setSelection(null);
        }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleSave = () => {
    if (onSave && sectionId) {
      onSave(sectionId, editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-brand-200 rounded-3xl p-6 shadow-2xl animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
           <span className="text-sm font-extrabold text-brand-700 flex items-center gap-2">
             <Edit className="w-4 h-4" /> ویرایش مستندات (حالت ویکی)
           </span>
           <div className="flex gap-2">
              <button onClick={handleCancel} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"><X className="w-5 h-5"/></button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20">
                <Save className="w-4 h-4" /> ذخیره تغییرات
              </button>
           </div>
        </div>
        <textarea 
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[600px] font-mono text-sm p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-200 outline-none resize-none leading-relaxed"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-8">
      {/* TOC Sidebar - Standard Flow in RTL (First child is Right) */}
      {showTOC && <TableOfContents headers={headers} />}

      <div className="flex-1 w-full min-w-0 relative group/editor" ref={containerRef} dir="rtl">
        
        {selection && onAskAI && (
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onAskAI(`Explain this context: "${selection.text}"`);
                    setSelection(null);
                }}
                className="fixed z-[100] bg-brand-900 text-white px-3 py-1.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold animate-in zoom-in-95 hover:scale-105 transition-transform cursor-pointer"
                style={{ left: selection.x, top: selection.y, transform: 'translate(-50%, -100%)' }}
            >
                <MessageSquarePlus className="w-3 h-3" /> Ask AI
            </button>
        )}

        {isEditable && sectionId && (
            <button 
            onClick={() => setIsEditing(true)}
            className="absolute -top-12 left-0 p-2.5 bg-white/90 backdrop-blur border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-200 shadow-sm opacity-0 group-hover/editor:opacity-100 transition-all z-10 flex items-center gap-2 text-xs font-bold"
            title="ویرایش این بخش"
            >
            <Edit className="w-4 h-4" /> ویرایش
            </button>
        )}

        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
            h1: ({children}) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <h1 id={id} className="text-3xl font-extrabold text-slate-900 mb-8 pb-4 border-b border-slate-200 bg-clip-text text-transparent bg-gradient-to-l from-slate-900 to-slate-700 scroll-mt-24">{children}</h1>;
            },
            h2: ({children}) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <div className="flex items-center gap-3 mt-10 mb-5 scroll-mt-24"><div className="h-8 w-1.5 bg-brand-500 rounded-full"></div><h2 id={id} className="text-2xl font-bold text-slate-800 m-0">{children}</h2></div>;
            },
            h3: ({children}) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <h3 id={id} className="text-lg font-bold text-slate-700 mt-8 mb-3 flex items-center gap-2 scroll-mt-24"><div className="w-2 h-2 rounded-full bg-slate-300"></div>{children}</h3>;
            },
            p: ({children}: any) => (
                <p className="text-slate-600 leading-8 mb-6 text-justify">
                {React.Children.map(children, child => {
                    if (typeof child === 'string' && knowledgeGraph) {
                        const parts = child.split(/(\s+|[,.;()])/); 
                        return parts.map((part, i) => {
                        const cleanPart = part.trim();
                        const isSymbol = (Object.values(knowledgeGraph) as CodeSymbol[]).some(s => s.name === cleanPart);
                        if (isSymbol && cleanPart.length > 2) { 
                            return <WikiLink key={i} symbolName={cleanPart} knowledgeGraph={knowledgeGraph}>{part}</WikiLink>;
                        }
                        return part;
                        });
                    }
                    return child;
                })}
                </p>
            ),
            code: CodeBlock,
            details: CollapsibleSection,
            summary: ({children}: any) => null, 
            blockquote: ({children}) => (
                <blockquote className="bg-gradient-to-r from-brand-50 to-transparent border-r-4 border-brand-500 p-6 my-6 rounded-r-xl italic text-slate-700 shadow-sm">
                    {children}
                </blockquote>
            )
            }}
        >
            {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownRenderer;
