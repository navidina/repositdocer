
import React, { useState, useEffect, useCallback } from 'react';
import { OllamaConfig, ProcessingLog, ProcessedFile, CodeSymbol, FileMetadata, BusinessRule, ArchViolation, ManualOverride, CodeIssue } from '../types';
import { IGNORED_DIRS, IGNORED_FILENAMES, ALLOWED_EXTENSIONS, CONFIG_FILES, LANGUAGE_MAP, PROMPT_LEVEL_1_ROOT, PROMPT_LEVEL_2_CODE, PROMPT_DATA_FLOW, PROMPT_LEVEL_7_ERD, PROMPT_LEVEL_8_CLASS, PROMPT_LEVEL_5_SEQUENCE, PROMPT_LEVEL_9_INFRA, PROMPT_USE_CASE, PROMPT_LEVEL_3_ARCH, PROMPT_LEVEL_API, PROMPT_DETAILED_SEQUENCE, PROMPT_SMART_AUDIT } from '../utils/constants';
import { checkOllamaConnection, generateCompletion } from '../services/ollamaService';
import { extractFileMetadata, buildGraph, generateContentHash } from '../services/codeParser';
import { LocalVectorStore } from '../services/vectorStore';
import { getFileMetadata, saveFileMetadata } from '../services/cacheService';
import { generateFileHeaderHTML, extractMermaidCode } from '../utils/markdownHelpers';
import { fetchGithubRepoTree, fetchGithubFileContent, parseGithubUrl } from '../services/githubService';

interface UseRepoProcessorProps {
  config: OllamaConfig;
  inputType: 'local' | 'github';
  files: FileList | null;
  githubUrl: string;
  docLevels: any;
  vectorStoreRef: React.MutableRefObject<LocalVectorStore | null>;
}

const STORAGE_KEY = 'rayan_docs_session';
const OVERRIDES_KEY = 'rayan_manual_overrides';
const CONCURRENCY_LIMIT = 1; 

const optimizePackageJson = (content: string): string => {
  try {
    const pkg = JSON.parse(content);
    const simplified = {
      name: pkg.name,
      description: pkg.description,
      version: pkg.version,
      main: pkg.main,
      scripts: pkg.scripts,
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies, 
      engines: pkg.engines
    };
    return JSON.stringify(simplified, null, 2);
  } catch (e) {
    return content.substring(0, 1500); 
  }
};

export const useRepoProcessor = () => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [docParts, setDocParts] = useState<Record<string, string>>({}); 
  const [manualOverrides, setManualOverrides] = useState<Record<string, ManualOverride>>({});
  const [stats, setStats] = useState<{ lang: string; lines: number; percent: number; color: string }[]>([]);
  const [knowledgeGraph, setKnowledgeGraph] = useState<Record<string, CodeSymbol>>({});
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]); 
  const [archViolations, setArchViolations] = useState<ArchViolation[]>([]); 
  const [zombieFiles, setZombieFiles] = useState<string[]>([]); 
  const [currentFile, setCurrentFile] = useState<string>('');
  
  const [fileMap, setFileMap] = useState<Record<string, ProcessedFile>>({});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [progress, setProgress] = useState(0);
  const [hasContext, setHasContext] = useState(false);

  useEffect(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (data.logs) setLogs(data.logs);
            if (data.generatedDoc) setGeneratedDoc(data.generatedDoc);
            if (data.docParts) setDocParts(data.docParts);
            if (data.stats) setStats(data.stats);
            if (data.knowledgeGraph) setKnowledgeGraph(data.knowledgeGraph);
            if (data.businessRules) setBusinessRules(data.businessRules);
            if (data.archViolations) setArchViolations(data.archViolations);
            if (data.zombieFiles) setZombieFiles(data.zombieFiles);
            setHasContext(!!data.generatedDoc);
            if (data.fileMap) setFileMap(data.fileMap);
        }
        const overrides = localStorage.getItem(OVERRIDES_KEY);
        if (overrides) {
            setManualOverrides(JSON.parse(overrides));
        }
    } catch (e) { console.error('Load session failed', e); }
  }, []);

  useEffect(() => {
    if (generatedDoc || Object.keys(docParts).length > 0) {
        try {
            const sessionData = {
                logs, generatedDoc, docParts, stats, knowledgeGraph, businessRules, archViolations, zombieFiles,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        } catch (e) {
            console.warn('LocalStorage full, could not auto-save session state.', e);
        }
    }
  }, [generatedDoc, docParts, logs, stats, knowledgeGraph, businessRules, archViolations, zombieFiles]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toISOString(), message, type }]);
  };

  const dismissError = () => setError(null);

  const saveManualOverride = (sectionId: string, content: string) => {
      const newOverrides = { ...manualOverrides, [sectionId]: { sectionId, content, updatedAt: Date.now() } };
      setManualOverrides(newOverrides);
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(newOverrides));
      setDocParts(prev => ({ ...prev, [sectionId]: content }));
      addLog(`Manual edit saved for section: ${sectionId}`, 'success');
  };

  const importSession = useCallback((data: any) => {
      if (!data) return;
      try {
          if (data.logs) setLogs(data.logs);
          if (data.generatedDoc) setGeneratedDoc(data.generatedDoc);
          if (data.docParts) setDocParts(data.docParts);
          if (data.stats) setStats(data.stats);
          if (data.knowledgeGraph) setKnowledgeGraph(data.knowledgeGraph);
          if (data.businessRules) setBusinessRules(data.businessRules);
          if (data.archViolations) setArchViolations(data.archViolations);
          if (data.zombieFiles) setZombieFiles(data.zombieFiles);
          if (data.fileMap) setFileMap(data.fileMap);
          if (data.manualOverrides) {
              setManualOverrides(data.manualOverrides);
              localStorage.setItem(OVERRIDES_KEY, JSON.stringify(data.manualOverrides));
          }
          setHasContext(true);
          try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch (e) {
              console.warn("Could not save imported session to LocalStorage.");
          }
          addLog("Session imported successfully.", "success");
      } catch (e) {
          console.error("Import failed", e);
          setError("Failed to import session data. Invalid file format.");
      }
  }, []);

  const reanalyzeFile = async (config: OllamaConfig, filePath: string) => {
     if (!fileMap[filePath]) return;
     const file = fileMap[filePath];
     addLog(`Re-analyzing ${filePath}...`, 'info');
     try {
         const prompt = `${PROMPT_LEVEL_2_CODE}\n\nFile: ${filePath}\nCode:\n\`\`\`\n${file.content}\n\`\`\``;
         const analysis = await generateCompletion(config, prompt, config.persona || 'You are a Senior Developer.');
         const header = generateFileHeaderHTML(filePath, file.lines);
         const newContent = `${header}\n\n${analysis}`;
         // Note: This logic only notifies for now, real implementation would update the specific part in docParts.code
         alert("Re-analysis complete. (Note: The main view requires a refresh logic to show partial updates).");
     } catch(e) {
         addLog(`Re-analysis failed: ${e}`, 'error');
     }
  };

  const processRepository = async ({ config, inputType, files, githubUrl, docLevels, vectorStoreRef }: UseRepoProcessorProps) => {
    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setError(null);
    setFileMap({}); 

    try {
      if (!config.model) throw new Error("Please configure a model in Settings first.");
      const isConnected = await checkOllamaConnection(config);
      if (!isConnected) throw new Error(`Cannot connect to LM Studio at ${config.baseUrl}`);

      addLog(`Connected to ${config.baseUrl}. Starting analysis...`, 'info');

      // 1. COLLECT FILES
      const processedFiles: ProcessedFile[] = [];
      const statsMap: Record<string, number> = {};

      if (inputType === 'local' && files) {
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const path = file.webkitRelativePath || file.name;
              const parts = path.split('/');
              if (parts.some(p => IGNORED_DIRS.has(p)) || IGNORED_FILENAMES.has(parts[parts.length - 1])) continue;
              const ext = '.' + file.name.split('.').pop()?.toLowerCase();
              if (!ALLOWED_EXTENSIONS.has(ext) && !CONFIG_FILES.has(file.name)) continue;
              const content = await file.text();
              const lines = content.split('\n').length;
              if (lines > 3000 && !CONFIG_FILES.has(file.name)) {
                  addLog(`Skipping ${path} (Too large: ${lines} lines)`, 'warning');
                  continue;
              }
              processedFiles.push({ path, content, size: file.size, lines, metadata: {} as any });
              const lang = LANGUAGE_MAP[ext] || 'Other';
              statsMap[lang] = (statsMap[lang] || 0) + 1;
          }
      } else if (inputType === 'github') {
          const repoInfo = parseGithubUrl(githubUrl);
          if (!repoInfo) throw new Error("Invalid GitHub URL");
          addLog(`Fetching ${repoInfo.owner}/${repoInfo.repo} tree...`, 'info');
          const { tree, branch } = await fetchGithubRepoTree(repoInfo.owner, repoInfo.repo);
          
          const relevantNodes = tree.filter(node => {
               if (node.type !== 'blob') return false;
               const parts = node.path.split('/');
               if (parts.some(p => IGNORED_DIRS.has(p)) || IGNORED_FILENAMES.has(parts[parts.length - 1])) return false;
               const ext = '.' + node.path.split('.').pop()?.toLowerCase();
               return ALLOWED_EXTENSIONS.has(ext) || CONFIG_FILES.has(parts[parts.length - 1]);
          }).slice(0, 300);

          for (let i = 0; i < relevantNodes.length; i++) {
              const node = relevantNodes[i];
              setProgress(10 + Math.round((i / relevantNodes.length) * 20));
              setCurrentFile(node.path);
              const content = await fetchGithubFileContent(repoInfo.owner, repoInfo.repo, branch, node.path);
              const lines = content.split('\n').length;
              processedFiles.push({ path: node.path, content, size: node.size || 0, lines, metadata: {} as any });
              const ext = '.' + node.path.split('.').pop()?.toLowerCase();
              const lang = LANGUAGE_MAP[ext] || 'Other';
              statsMap[lang] = (statsMap[lang] || 0) + 1;
          }
      }

      if (processedFiles.length === 0) throw new Error("No valid files found to analyze.");
      
      const totalFiles = processedFiles.length;
      const sortedStats = Object.entries(statsMap)
          .map(([lang, count]) => ({ lang, lines: count, percent: (count / totalFiles) * 100, color: '#8b5cf6' }))
          .sort((a, b) => b.percent - a.percent);
      setStats(sortedStats);

      // 2. PARSE METADATA
      addLog(`Parsing ${processedFiles.length} files...`, 'info');
      const fileMapBuild: Record<string, ProcessedFile> = {};
      
      for (let i = 0; i < processedFiles.length; i++) {
          const file = processedFiles[i];
          setCurrentFile(file.path);
          setProgress(30 + Math.round((i / processedFiles.length) * 10));
          
          const metadata = await extractFileMetadata(file.content, file.path);
          
          // Smart Audit
          const issues: CodeIssue[] = [];
          if (file.content.includes('dangerouslySetInnerHTML')) {
              issues.push({ id: `sec-${i}`, filePath: file.path, line: 0, category: 'security', severity: 'high', title: 'Unsafe HTML Injection', description: 'Usage of dangerouslySetInnerHTML.', suggestion: 'Sanitize input.' });
          }
          if (file.content.match(/console\.(log|debug)/) && !file.path.includes('test')) {
              issues.push({ id: `perf-${i}`, filePath: file.path, line: 0, category: 'best_practice', severity: 'low', title: 'Console Log left', description: 'Remove in production.', suggestion: 'Delete line.' });
          }
          metadata.issues = issues;
          file.metadata = metadata;
          fileMapBuild[file.path] = file;
      }
      setFileMap(fileMapBuild);

      // 3. BUILD GRAPH
      addLog('Building Knowledge Graph...', 'info');
      const { symbolTable } = buildGraph(processedFiles);
      setKnowledgeGraph(symbolTable);

      const zombies = processedFiles.filter(f => f.metadata.isZombie).map(f => f.path);
      setZombieFiles(zombies);
      const violations = processedFiles.flatMap(f => f.metadata.archViolations);
      setArchViolations(violations);

      // 4. VECTOR INDEXING
      if (!vectorStoreRef.current) vectorStoreRef.current = new LocalVectorStore(config);
      addLog('Indexing vectors...', 'info');
      vectorStoreRef.current.addDocuments(processedFiles);

      // 5. GENERATE MODULES
      // We use independent try-catch blocks for each module to prevent cascading failures.
      
      const configFileContent = processedFiles.filter(f => CONFIG_FILES.has(f.path.split('/').pop()!))
          .map(f => `File: ${f.path}\n${f.path.endsWith('json') ? optimizePackageJson(f.content) : f.content.substring(0, 1000)}`)
          .join('\n\n');
      
      const fileTree = processedFiles.map(f => f.path).join('\n');
      const allSourceContext = processedFiles.slice(0, 50).map(f => `File: ${f.path}\n${f.content.substring(0, 500)}`).join('\n\n'); // Summary context

      // --- MODULE 1: ROOT ---
      if (docLevels.root) {
          try {
              setCurrentFile('Generating README...');
              addLog('Generating High-Level Overview...', 'info');
              const res = await generateCompletion(config, `${PROMPT_LEVEL_1_ROOT}\n\nProject Files:\n${fileTree}\n\nConfigs:\n${configFileContent}`, config.persona || 'Technical Writer');
              setDocParts(prev => ({ ...prev, root: res }));
          } catch(e) { console.error(e); addLog('Root Docs Failed', 'error'); }
      }

      // --- MODULE 2: ARCHITECTURE ---
      if (docLevels.arch) {
          try {
              setCurrentFile('Generating Architecture...');
              addLog('Analyzing Architecture...', 'info');
              const res = await generateCompletion(config, `${PROMPT_LEVEL_3_ARCH}\n\nFile Structure:\n${fileTree}\n\nConfigs:\n${configFileContent}`, config.persona || 'Architect');
              setDocParts(prev => ({ ...prev, arch: res }));
          } catch(e) { console.error(e); addLog('Arch Docs Failed', 'error'); }
      }

      // --- MODULE 3: DATA FLOW ---
      if (docLevels.dataFlow) {
          try {
              setCurrentFile('Generating Data Flow...');
              addLog('Tracing Data Flows...', 'info');
              // Focus on controllers/services for data flow
              const logicFiles = processedFiles.filter(f => f.path.match(/(controller|service|store|api)/i)).map(f => f.content).join('\n').substring(0, 6000);
              const res = await generateCompletion(config, `${PROMPT_DATA_FLOW}\n\nKey Logic Snippets:\n${logicFiles || allSourceContext.substring(0, 6000)}`, 'System Architect');
              setDocParts(prev => ({ ...prev, dataFlow: `## Data Flow Diagram\n\n${extractMermaidCode(res)}` }));
          } catch(e) { console.error(e); addLog('DataFlow Failed', 'error'); }
      }

      // --- MODULE 4: USE CASES ---
      if (docLevels.useCase) {
          try {
              setCurrentFile('Generating Use Cases...');
              addLog('Extracting Use Cases...', 'info');
              const res = await generateCompletion(config, `${PROMPT_USE_CASE}\n\nStructure:\n${fileTree}\n\nConfigs:\n${configFileContent}`, 'Product Manager');
              setDocParts(prev => ({ ...prev, useCase: `## User Journey & Use Cases\n\n${extractMermaidCode(res)}` }));
          } catch(e) { console.error(e); addLog('UseCase Failed', 'error'); }
      }

      // --- MODULE 5: INFRA ---
      if (docLevels.infra) {
          try {
              setCurrentFile('Generating Infra...');
              addLog('Analyzing Infrastructure...', 'info');
              const infraFiles = processedFiles.filter(f => f.path.match(/(docker|compose|kube|terraform|helm|\.conf)/i)).map(f => `File: ${f.path}\n${f.content}`).join('\n');
              if (infraFiles) {
                  const res = await generateCompletion(config, `${PROMPT_LEVEL_9_INFRA}\n\nInfra Files:\n${infraFiles}`, 'DevOps Engineer');
                  setDocParts(prev => ({ ...prev, infra: `## Infrastructure Diagram\n\n${extractMermaidCode(res)}` }));
              }
          } catch(e) { console.error(e); addLog('Infra Docs Failed', 'error'); }
      }

      // --- MODULE 6: ERD & API ---
      if (docLevels.erd || docLevels.api) {
           const schemaFiles = processedFiles.filter(f => f.metadata.isDbSchema || f.path.match(/(model|entity|schema|dto)/i)).map(f => f.content).join('\n');
           const apiFiles = processedFiles.filter(f => f.path.match(/(route|controller|endpoint|api)/i)).map(f => f.content).join('\n');

           if (docLevels.erd && schemaFiles) {
               try {
                   setCurrentFile('Generating ERD...');
                   addLog('Generating Entity Relationship Diagram...', 'info');
                   const res = await generateCompletion(config, `${PROMPT_LEVEL_7_ERD}\n\nCode:\n${schemaFiles.substring(0, 5000)}`, 'DB Architect');
                   setDocParts(prev => ({ ...prev, erd: `## Entity Relationship Diagram\n\n${extractMermaidCode(res)}` }));
               } catch(e) { addLog('ERD Failed', 'error'); }
           }
           
           if (docLevels.api && apiFiles) {
               try {
                   setCurrentFile('Generating API Flow...');
                   addLog('Generating API Flow Diagram...', 'info');
                   const res = await generateCompletion(config, `${PROMPT_LEVEL_API}\n\nCode:\n${apiFiles.substring(0, 5000)}`, 'Backend Dev');
                   setDocParts(prev => ({ ...prev, api: `## API Flow\n\n${extractMermaidCode(res)}` }));
               } catch(e) { addLog('API Docs Failed', 'error'); }
           }
      }

      // --- MODULE 7: CLASS DIAGRAM & SEQUENCE ---
      if (docLevels.classDiagram) {
          try {
              setCurrentFile('Generating Class Diagram...');
              const classFiles = processedFiles.filter(f => f.content.includes('class ') || f.content.includes('interface ')).map(f => f.content).join('\n').substring(0, 5000);
              if (classFiles) {
                  const res = await generateCompletion(config, `${PROMPT_LEVEL_8_CLASS}\n\nClasses:\n${classFiles}`, 'Architect');
                  setDocParts(prev => ({ ...prev, class: `## Class Diagram\n\n${extractMermaidCode(res)}` }));
              }
          } catch (e) { addLog('Class Diagram Failed', 'error'); }
      }

      if (docLevels.sequence) {
          try {
              setCurrentFile('Generating Sequence Diagram...');
              const res = await generateCompletion(config, `${PROMPT_LEVEL_5_SEQUENCE}\n\nContext:\n${allSourceContext.substring(0, 5000)}`, 'Architect');
              setDocParts(prev => ({ ...prev, sequence: `## Sequence Diagram\n\n${extractMermaidCode(res)}` }));
          } catch (e) { addLog('Sequence Diagram Failed', 'error'); }
      }

      setProgress(60);

      // --- MODULE 8: CODE ANALYSIS (HEAVY) ---
      if (docLevels.code) {
          const codeFiles = processedFiles.filter(f => 
              !f.metadata.isTestFile && 
              !CONFIG_FILES.has(f.path.split('/').pop()!) &&
              !f.path.includes('.min.') &&
              f.lines < 2000 
          ); 
          
          addLog(`Generating Deep Code Analysis for ${codeFiles.length} files...`, 'info');
          let accumulatedCodeDocs = '';

          // Helper to process a single file
          const processFile = async (file: ProcessedFile) => {
              const header = generateFileHeaderHTML(file.path, file.lines);
              const prompt = `${PROMPT_LEVEL_2_CODE}\n\nFile: ${file.path}\nCode:\n\`\`\`\n${file.content}\n\`\`\``;
              const analysis = await generateCompletion(config, prompt, 'Senior Dev'); 
              return `## ${file.path}\n${header}\n\n${analysis}\n\n---\n\n`;
          };

          for (let i = 0; i < codeFiles.length; i++) {
              const file = codeFiles[i];
              setCurrentFile(`Analyzing file ${i+1}/${codeFiles.length}: ${file.path.split('/').pop()}`);
              
              try {
                  const res = await processFile(file);
                  accumulatedCodeDocs += res;
                  setDocParts(prev => ({ ...prev, code: accumulatedCodeDocs }));
              } catch (e) {
                  console.error(`Failed to analyze ${file.path}`, e);
                  accumulatedCodeDocs += `## ${file.path}\n\n*Analysis Failed (Timeout/Error)*\n\n---\n\n`;
                  setDocParts(prev => ({ ...prev, code: accumulatedCodeDocs }));
              }
              setProgress(60 + Math.round(((i + 1) / codeFiles.length) * 40));
          }
      }

      setGeneratedDoc('Complete');
      setHasContext(true);
      setProgress(100);
      addLog('Documentation generation complete!', 'success');

    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred.");
      addLog(`Error: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setCurrentFile('');
    }
  };

  return {
    logs,
    isProcessing,
    error,
    dismissError,
    progress,
    generatedDoc,
    hasContext,
    stats,
    knowledgeGraph,
    docParts,
    businessRules,
    archViolations,
    zombieFiles,
    currentFile,
    manualOverrides,
    fileMap,
    processRepository,
    saveManualOverride,
    reanalyzeFile,
    importSession 
  };
};
