
/**
 * Generates an HTML snippet for a file header (used in Markdown details/summary).
 * Displays an icon, filename, path, and line count.
 */
export const generateFileHeaderHTML = (path: string, lines: number) => {
  const parts = path.split('/');
  const filename = parts.pop();
  const dir = parts.join('/');
  
  return `
<div class="file-header">
  <div class="file-info-group">
    <span class="file-icon">📄</span>
    <span class="file-name">${filename}</span>
    <span class="file-path">${dir ? `${dir}/` : ''}</span>
  </div>
  <span class="file-size">${lines.toLocaleString()} Lines</span>
</div>`;
};

/**
 * AGGRESSIVE MERMAID SANITIZER
 * Fixes common LLM syntax errors for specific diagram types.
 */

const sanitizeFlowchart = (code: string): string => {
  let lines = code.split('\n');
  const fixedLines = lines.map(line => {
    let l = line.trim();
    // Fix 1: Ensure node IDs are valid (no spaces/special chars unless allowed)
    // Pattern: Node Name["Label"] -> Node_Name["Label"] if Node Name isn't quoted
    // This is hard to regex perfectly, so we focus on the label part.
    
    // Fix 2: Escape quotes inside labels: ["Some "quoted" text"] -> ["Some 'quoted' text"]
    l = l.replace(/\["([^"]*)"\]/g, (match, content) => {
      const escaped = content.replace(/"/g, "'"); // Replace inner double quotes with single
      return `["${escaped}"]`;
    });

    // Fix 3: Quote unquoted labels in relationships: -->|Text| -> -->|"Text"|
    l = l.replace(/(-+\.|==+)>\|([^"|]+)\|/g, '$1|"$2"|');

    // Fix 4: Remove invalid chars from Node IDs (start of line)
    // Capture A[Label] or A-->B
    // We try to ensure the ID part doesn't have spaces if it's not a subgraph
    if (!l.startsWith('subgraph') && !l.startsWith('end') && !l.startsWith('%%')) {
         // This is risky, skipping for now to avoid breaking valid IDs
    }

    return l;
  });
  return fixedLines.join('\n');
};

const sanitizeERD = (code: string): string => {
  let lines = code.split('\n');
  const fixedLines = lines.map(line => {
    let l = line.trim();
    
    // Fix 1: Remove "identifying" keyword (not supported in standard Mermaid ERD)
    l = l.replace(/\bidentifying\b/gi, '');

    // Fix 2: Fix relationship syntax errors
    // LLMs often output: Entity1 |o--|| Entity2 : "label"
    // Mermaid strict: Entity1 ||--o{ Entity2 : label
    // We ensure the label is properly quoted if it contains spaces
    if (l.includes(':') && (l.includes('--') || l.includes('..'))) {
       const parts = l.split(':');
       if (parts.length === 2) {
         let label = parts[1].trim();
         // Remove existing quotes to normalize
         label = label.replace(/^"|"$/g, ''); 
         // Re-add quotes
         l = `${parts[0].trim()} : "${label}"`;
       }
    }

    // Fix 3: Entity Attribute syntax
    // string name -> string name
    // name string -> string name (Mermaid prefers Type Name)
    // This is hard to automate safely, but we can fix weird chars
    if (l.match(/^[a-zA-Z0-9_]+\s+[a-zA-Z0-9_]+(\s+PK|\s+FK)?$/)) {
        // Looks like valid attribute
    } else if (l.includes('{') || l.includes('}')) {
        // Bracket lines, keep them
    } else if (l.match(/^[a-zA-Z0-9_]+\s+[a-zA-Z0-9_]+/)) {
         // Attempt to sanitize attribute line
    }

    return l;
  });
  return fixedLines.join('\n');
};

const sanitizeClassDiagram = (code: string): string => {
  let lines = code.split('\n');
  const fixedLines = lines.map(line => {
    let l = line.trim();
    
    // Fix 1: Generics syntax. List<T> breaks often. Use List~T~
    l = l.replace(/<([a-zA-Z0-9_]+)>/g, '~$1~');
    
    // Fix 2: Fix "note" syntax errors
    // note right of X : label -> note right of X : "label"
    if (l.startsWith('note ')) {
       // if it doesn't have quotes after colon
       if (l.includes(':') && !l.includes('"')) {
          l = l.replace(/: (.*)$/, ': "$1"');
       }
    }

    // Fix 3: Remove trailing junk characters
    l = l.replace(/[;]+$/, '');

    return l;
  });
  return fixedLines.join('\n');
};

const cleanMermaidCode = (raw: string): string => {
  if (!raw) return '';
  
  // 1. Strip markdown code blocks
  let code = raw.replace(/```mermaid/gi, '').replace(/```/g, '').trim();

  // 2. Remove common textual fluff
  code = code.split('\n').filter(line => {
    const l = line.trim().toLowerCase();
    return !l.startsWith('here is') && 
           !l.startsWith('this diagram') && 
           !l.startsWith('---') &&
           !l.startsWith('mermaid') &&
           l.length > 0;
  }).join('\n');

  // 3. Detect Diagram Type
  let type = '';
  if (code.match(/^graph\s/i) || code.match(/^flowchart\s/i)) type = 'flowchart';
  else if (code.match(/^erDiagram/i)) type = 'erDiagram';
  else if (code.match(/^classDiagram/i)) type = 'classDiagram';
  else if (code.match(/^sequenceDiagram/i)) type = 'sequenceDiagram';

  // 4. Apply Type-Specific Sanitization
  if (type === 'flowchart') {
    if (!code.toLowerCase().startsWith('flowchart')) code = 'flowchart TB\n' + code;
    code = sanitizeFlowchart(code);
  } else if (type === 'erDiagram') {
    if (!code.toLowerCase().startsWith('erdiagram')) code = 'erDiagram\n' + code;
    code = sanitizeERD(code);
  } else if (type === 'classDiagram') {
    if (!code.toLowerCase().startsWith('classdiagram')) code = 'classDiagram\n' + code;
    code = sanitizeClassDiagram(code);
  } else if (type === 'sequenceDiagram') {
    if (!code.toLowerCase().startsWith('sequencediagram')) code = 'sequenceDiagram\n' + code;
    // Basic Sequence Fixes
    code = code.replace(/participant (.*) as (.*)/g, 'participant $1 as "$2"');
  } else {
     // Default fallback for unknown types: Assume flowchart if arrows exist
     if (code.includes('-->') || code.includes('==>')) {
        code = 'flowchart TB\n' + sanitizeFlowchart(code);
     }
  }

  return code;
};

/**
 * Extracts and cleans Mermaid diagram code from an LLM response.
 * Uses the new aggressive sanitizer.
 */
export const extractMermaidCode = (response: string): string => {
  if (!response) return '';

  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/gi;
  let matches: string[] = [];
  let match;
  
  // 1. Try to find explicit blocks
  while ((match = mermaidRegex.exec(response)) !== null) {
    if (match[1] && match[1].trim()) {
      matches.push(cleanMermaidCode(match[1].trim()));
    }
  }

  if (matches.length > 0) {
    return matches.map(c => `\`\`\`mermaid\n${c}\n\`\`\``).join('\n\n');
  }

  // 2. Fallback: Heuristic search
  const keywords = ['sequenceDiagram', 'classDiagram', 'erDiagram', 'flowchart', 'graph ', 'stateDiagram'];
  for (const keyword of keywords) {
    const regex = new RegExp(`^(${keyword}[\\s\\S]*?)(?=\\n\\n|\\n#|\\n\`\`\`|$)`, 'im');
    const match = response.match(regex);
    if (match && match[1]) {
      const cleaned = cleanMermaidCode(match[1].trim());
      if (cleaned.length > 20) {
        return `\`\`\`mermaid\n${cleaned}\n\`\`\``;
      }
    }
  }

  return '';
};
