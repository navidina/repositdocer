
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Loader2, ZoomIn, ZoomOut, RefreshCcw, Download, RotateCcw } from 'lucide-react';
import mermaid from 'mermaid';

// Helper to clean LLM output for Mermaid
const cleanCodeForRender = (rawCode: string): string => {
  if (!rawCode) return '';
  let code = rawCode
      .replace(/```mermaid/gi, '')
      .replace(/```/g, '')
      .trim();
  
  // Basic safety fixes
  code = code.replace(/\["([^"]*)"\]/g, (match, content) => {
      return `["${content.replace(/"/g, "'")}"]`;
  });
  
  if (code.toLowerCase().includes('erdiagram')) {
      code = code.replace(/\bidentifying\b/gi, '');
      code = code.replace(/([a-zA-Z0-9_]+)\s+([|o}]+--[|o{]+)\s+([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_" ]+)/g, '$1 $2 $3 : "$4"');
  }

  if (code.toLowerCase().includes('classdiagram')) {
      code = code.replace(/<([a-zA-Z0-9_]+)>/g, '~$1~');
  }

  return code;
};

// Memoize the component to prevent unnecessary re-renders when parent updates
const MermaidRenderer = React.memo(({ code }: { code: string }) => {
  const [svg, setSvg] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  
  // View controls
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Initialize Mermaid once
    try {
        mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'base',
            maxTextSize: 500000, 
            securityLevel: 'loose',
            suppressErrorRendering: true, // Handle errors manually
            themeVariables: { 
              fontFamily: 'Vazirmatn', 
              fontSize: '14px',
              primaryColor: '#f8fafc',
              edgeLabelBackground: '#ffffff',
              tertiaryColor: '#f1f5f9'
            },
            er: { useMaxWidth: false },
            flowchart: { useMaxWidth: false, htmlLabels: true }
        });
    } catch(e) { console.warn("Mermaid init warning:", e); }

    return () => { mountedRef.current = false; };
  }, []);

  // --- Click Handler for SVG Navigation ---
  // Mermaid SVG usually puts IDs on the <g> elements.
  // We use event delegation on the container.
  const handleSvgClick = (e: React.MouseEvent) => {
      if (isDragging) return; // Ignore drag clicks
      
      const target = e.target as HTMLElement;
      // Walk up to find a node group
      const nodeGroup = target.closest('.node');
      if (nodeGroup) {
          // Extract text content or id to try and find a matching header in the doc
          const id = nodeGroup.id;
          const textElement = nodeGroup.querySelector('.nodeLabel') || nodeGroup.querySelector('text');
          const text = textElement?.textContent?.trim();

          if (text) {
              // Try to find a header with this ID or Text in the page
              const possibleId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const el = document.getElementById(possibleId);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Highlight effect
                  el.classList.add('bg-yellow-100', 'transition-colors', 'duration-1000');
                  setTimeout(() => el.classList.remove('bg-yellow-100'), 2000);
              }
          }
      }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.2));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleDownload = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isError) return;
    // Only drag if middle mouse or Ctrl+Click or just click on background
    // But since we want "click node", we need to distinguish drag vs click.
    // Simple logic: if mouse moves > 5px, it's a drag.
    
    e.preventDefault();
    setIsDragging(false); // Will set to true on move
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Check if mouse button is down
    if (e.buttons !== 1) return;
    
    setIsDragging(true);
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
      // Don't reset isDragging immediately so click handler knows if it was a drag
      setTimeout(() => setIsDragging(false), 50);
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(s => Math.min(Math.max(s + delta, 0.1), 5));
      }
  };

  const renderDiagram = useCallback(async (codeToRender: string) => {
    if (!codeToRender || !codeToRender.trim()) {
        if(mountedRef.current) setIsRendering(false);
        return;
    }
    
    if(mountedRef.current) {
        setIsRendering(true);
        setIsError(false);
        setErrorMsg('');
    }

    try {
      let cleanCode = cleanCodeForRender(codeToRender);

      // Auto-prefix
      if (!cleanCode.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)/)) {
          cleanCode = `flowchart TB\n${cleanCode}`;
      }

      // Cleanup DOM just in case
      const existing = document.getElementById(renderId.current);
      if (existing) existing.remove();

      // Render
      const renderPromise = mermaid.render(renderId.current, cleanCode);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

      // @ts-ignore
      const { svg } = await Promise.race([renderPromise, timeoutPromise]);
      
      if(mountedRef.current) {
          setSvg(svg);
          setIsRendering(false);
      }
    } catch (error: any) {
      console.error('Mermaid Render Error:', error);
      if(mountedRef.current) {
          // Retry logic inside the error handler for simplicity without recursion loops
          if (!codeToRender.includes(':::')) {
               // If it wasn't a styling issue, fail
               setIsError(true);
               setErrorMsg(error.message || 'Syntax Error');
               setSvg('');
          } else {
               // Try once stripping styles with safer regex
               try {
                  // Replaced aggressive regex that was deleting connections
                  // Old: .replace(/:::.*$/gm, '') 
                  // New: Only removes :::classname part
                  const simplified = codeToRender
                    .replace(/:::[a-zA-Z0-9_\-]+/g, '') // Remove node class attachment
                    .replace(/^classDef\s+.*$/gm, '')   // Remove class definitions
                    .replace(/^style\s+.*$/gm, '');     // Remove style definitions

                  const { svg: svg2 } = await mermaid.render(renderId.current + '-retry', simplified);
                  setSvg(svg2);
               } catch(e) {
                  setIsError(true);
                  setErrorMsg('Failed after retry');
               }
          }
          setIsRendering(false);
      }
    }
  }, []);

  useEffect(() => {
    // DEBOUNCE LOGIC
    const timer = setTimeout(() => {
        if (code && code.trim()) {
            renderDiagram(code);
        } else {
            setIsRendering(false);
        }
    }, 800);

    return () => clearTimeout(timer);
  }, [code, renderDiagram]);

  if (!code || !code.trim()) {
      return (
          <div className="flex items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-xs text-slate-400">بدون داده گرافیکی</span>
          </div>
      );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-left dir-ltr my-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
           <p className="text-red-600 text-sm font-bold flex items-center gap-2">
             <AlertCircle className="w-4 h-4" /> Mermaid Syntax Error
           </p>
           <button 
             onClick={() => renderDiagram(code)} 
             className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
           >
             <RotateCcw className="w-3 h-3" /> تلاش مجدد
           </button>
        </div>
        <div className="text-red-500 text-[10px] mb-3 font-mono leading-relaxed bg-white/50 p-2 rounded max-h-20 overflow-auto">{errorMsg}</div>
        <details>
            <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">نمایش کد خام</summary>
            <pre className="text-slate-500 text-[10px] font-mono overflow-auto whitespace-pre-wrap bg-slate-100 p-3 rounded-xl max-h-40 border border-slate-200 mt-2">{code}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="relative group my-8">
      <div 
        className="bg-white rounded-3xl overflow-hidden shadow-soft border border-slate-100 select-none relative transition-all hover:shadow-md" 
        dir="ltr"
        style={{ height: '550px' }}
      >
         {isRendering && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                 <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
                 <span className="text-sm text-slate-500 font-bold">در حال رندر...</span>
             </div>
         )}
         
         {/* Floating Tools */}
         <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-100 transition-all opacity-0 group-hover:opacity-100">
            <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors" title="Zoom In"><ZoomIn className="w-5 h-5" /></button>
            <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors" title="Zoom Out"><ZoomOut className="w-5 h-5" /></button>
            <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors" title="Reset"><RefreshCcw className="w-5 h-5" /></button>
            <div className="h-px bg-slate-100 mx-1"></div>
            <button onClick={handleDownload} className="p-2 hover:bg-slate-100 rounded-xl text-brand-600 transition-colors" title="Download SVG"><Download className="w-5 h-5" /></button>
         </div>

         <div 
           ref={containerRef}
           className={`w-full h-full flex items-center justify-center overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
           onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
           onWheel={handleWheel}
           onClick={handleSvgClick}
         >
            {svg && (
                <div 
                style={{ 
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    transformOrigin: 'center center'
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
                />
            )}
         </div>
      </div>
      <div className="flex justify-between items-center px-4 mt-2">
         <span className="text-[10px] text-slate-400 font-medium">Click Node to Scroll • Pan: Drag • Zoom: Ctrl + Scroll</span>
         <span className="text-[10px] text-brand-400 font-mono">Mermaid v11</span>
      </div>
    </div>
  );
});

export default MermaidRenderer;
