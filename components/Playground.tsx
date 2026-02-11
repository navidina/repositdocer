
import React, { useState } from 'react';
import { Play, RotateCcw, AlertTriangle, Terminal } from 'lucide-react';

interface PlaygroundProps {
  initialCode?: string;
}

const Playground: React.FC<PlaygroundProps> = ({ initialCode = '' }) => {
  const [code, setCode] = useState(initialCode || `// Write a pure JS function to test
function calculateTax(amount) {
  if (amount > 1000) return amount * 1.2;
  return amount * 1.1;
}

return calculateTax(1500);`);
  
  const [output, setOutput] = useState<string>('Ready to run...');
  const [isError, setIsError] = useState(false);

  const runCode = () => {
    try {
      setIsError(false);
      // Safe-ish evaluator using new Function.
      // NOTE: This runs in the browser, so it has access to window/document unless sandboxed further.
      // For a dev tool, this is usually acceptable.
      const func = new Function(code);
      const result = func();
      setOutput(result !== undefined ? JSON.stringify(result, null, 2) : 'Executed successfully (No return value)');
    } catch (e: any) {
      setIsError(true);
      setOutput(e.toString());
    }
  };

  return (
    <div className="my-6 bg-[#1e293b] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
      <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
           <Terminal className="w-4 h-4 text-brand-400" />
           <span className="text-xs font-bold text-slate-300">Live Playground (JS Engine)</span>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setCode(initialCode)} className="p-1 hover:bg-slate-800 rounded text-slate-400" title="Reset">
               <RotateCcw className="w-3 h-3" />
            </button>
            <button onClick={runCode} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors">
               <Play className="w-3 h-3" /> Run
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 h-64">
         <textarea 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full bg-[#0f172a] text-blue-300 font-mono text-xs p-4 resize-none outline-none border-r border-slate-800"
            spellCheck={false}
         />
         <div className="bg-[#0f172a] p-4 overflow-auto">
            <div className="text-[10px] text-slate-500 font-bold mb-2 uppercase">Console Output</div>
            <pre className={`font-mono text-xs whitespace-pre-wrap ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
                {output}
            </pre>
         </div>
      </div>
      
      <div className="bg-slate-900/50 p-2 text-[10px] text-slate-500 flex items-center gap-2">
         <AlertTriangle className="w-3 h-3 text-amber-500" />
         This environment runs client-side. Imports (require/import) are not supported. Use pure functions.
      </div>
    </div>
  );
};

export default Playground;
