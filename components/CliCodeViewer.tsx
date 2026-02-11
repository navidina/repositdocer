

import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

const CliCodeViewer: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState(false);
  const [copiedPackage, setCopiedPackage] = useState(false);

  const packageJsonContent = `{
  "name": "rayan-docs-cli",
  "version": "1.0.0",
  "description": "Auto-generate documentation using local Ollama (Rayan HamAfza)",
  "main": "index.js",
  "type": "module",
  "bin": {
    "rayandocs": "./index.js"
  },
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "ollama": "^0.5.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}`;

  // We construct the large string carefully to avoid template literal hell
  const part1 = `#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import ollama from 'ollama';

// --- Configuration ---
const CONFIG = {
  model: 'qwen2.5-coder:14b', // پیش‌فرض: بهترین مدل برای کد
  ignoredDirs: new Set([
    'node_modules', '.git', '.vscode', 'dist', 'build', 'coverage', '.next', 'target',
    'venv', '.venv', 'env', '.env', '__pycache__', 'Lib', 'site-packages', 'Scripts', 'Include'
  ]),
  ignoredExts: new Set(['.png', '.jpg', '.jpeg', '.lock', '.exe', '.bin', '.gz', '.zip', '.pdf']),
  configFiles: new Set([
    'package.json', 'tsconfig.json', 'Dockerfile', 'requirements.txt', 
    'Cargo.toml', 'go.mod', 'README.md', 'Makefile'
  ]),
  maxFileSize: 20000 // characters
};

// --- System Prompts (Table-Based Structure) ---
const PROMPTS = {
  global: \`شما یک معمار نرم‌افزار ارشد هستید.
وظیفه: تحلیل جامع پروژه.
قوانین: اصطلاحات فنی انگلیسی بمانند. خروجی مارک‌داون باشد.

ساختار خروجی:
1. **مقدمه جامع (Executive Summary):** توضیحات کامل درباره هدف پروژه.
2. **جدول استک فنی (Tech Stack Table):**
   | دسته | تکنولوژی | توضیحات |
   | --- | --- | --- |
3. **تحلیل ساختار:** بررسی معماری پوشه‌ها.\`,

  code: \`شما یک Senior Developer هستید.
وظیفه: مستندسازی فایل کد.
قوانین: نام‌های خاص انگلیسی بمانند.

ساختار خروجی:
1. **هدف:** پاراگراف توضیحی.
2. **جدول اجزا (Components Table):**
   | نام (انگلیسی) | عملکرد (فارسی) | نوع/ورودی (انگلیسی) |
   | --- | --- | --- |
3. **تحلیل منطق:** توضیحات تکمیلی.\`
};

// --- Helper: Scan Directory ---
async function scanDirectory(dir, rootDir = dir) {
  let fileTree = '';
  let sourceFiles = [];
  let configContents = [];

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (CONFIG.ignoredDirs.has(entry.name)) continue;
      fileTree += \`DIR: \${relativePath}\\n\`;
      const result = await scanDirectory(fullPath, rootDir);
      fileTree += result.fileTree;
      sourceFiles.push(...result.sourceFiles);
      configContents.push(...result.configContents);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (CONFIG.ignoredExts.has(ext)) continue;

      fileTree += \`FILE: \${relativePath}\\n\`;

      if (CONFIG.configFiles.has(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          configContents.push(\`--- \${relativePath} ---\\n\${content}\\n\`);
        } catch (e) { console.warn(\`Skipped reading config \${relativePath}: \${e.message}\`); }
      } else {
        sourceFiles.push(fullPath);
      }
    }
  }

  return { fileTree, sourceFiles, configContents };
}

// --- Helper: LLM Interaction ---
async function queryLLM(prompt, system) {
  try {
    const response = await ollama.chat({
      model: CONFIG.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
    });
    return response.message.content;
  } catch (error) {
    console.error(\`❌ LLM Error: \${error.message}\`);
    return "> **خطا در تولید مستندات برای این بخش.**";
  }
}

// --- Main Execution ---
async function main() {
  const repoPath = process.argv[2] || process.cwd();
  const absPath = path.resolve(repoPath);

  console.log(\`🚀 شروع رایان‌داکس روی مسیر: \${absPath}\`);
  console.log(\`🤖 استفاده از مدل: \${CONFIG.model}\`);

  try {
    // Phase 0: Scan
    console.log('\\n📂 در حال اسکن فایل‌های پروژه...');
    const { fileTree, sourceFiles, configContents } = await scanDirectory(absPath);
    console.log(\`✅ تعداد \${sourceFiles.length} فایل کد و \${configContents.length} فایل کانفیگ پیدا شد.\`);

    let finalDoc = \`# مستندات جامع پروژه\\n\\nتولید شده برای مسیر: \${absPath}\\n\\n\`;

    // Phase 1: Architecture
    console.log('\\n🧠 فاز ۱: تحلیل معماری و تکنولوژی‌ها...');
    
    // Read source content for better context (Prevents hallucinations)
    const sourceContextPromises = sourceFiles.map(async (f) => {
      try {
        const stats = await fs.stat(f);
        if (stats.size > CONFIG.maxFileSize) return '';
        const content = await fs.readFile(f, 'utf-8');
        return \`\\n--- SOURCE FILE: \${path.relative(absPath, f)} ---\\n\${content}\`;
      } catch (e) { return ''; }
    });
    const fullSourceContext = (await Promise.all(sourceContextPromises)).join('\\n');

    const globalPrompt = \`File Tree:\\n\${fileTree}\\n\\nConfig Files:\\n\${configContents.join('')}\\n\\nSource Code Content:\\n\${fullSourceContext}\`;
    
    const archDoc = await queryLLM(globalPrompt, PROMPTS.global);
    finalDoc += \`## نمای کلی معماری\\n\\n\${archDoc}\\n\\n---\\n\\n## تحلیل فایل‌ها\\n\\n\`;
    console.log('✅ تحلیل معماری انجام شد.');

    // Phase 2: File Analysis
    console.log(\`\\n📝 فاز ۲: پردازش \${sourceFiles.length} فایل...\`);
    
    for (const filePath of sourceFiles) {
      const relPath = path.relative(absPath, filePath);
      process.stdout.write(\`   در حال پردازش: \${relPath} ... \`);

      try {
        const stats = await fs.stat(filePath);
        if (stats.size > CONFIG.maxFileSize) {
          console.log('⚠️ رد شد (حجم زیاد)');
          finalDoc += \`### \${relPath}\\n\\n*Skipped: File too large (>20KB)*\\n\\n\`;
          continue;
        }

        const content = await fs.readFile(filePath, 'utf-8');`;

  // This part is tricky because it contains backticks inside the generated code string
  const part2 = `
        const filePrompt = \`File: \${relPath}\\n\\nCode:\\n\`\`\`\\n\${content}\\n\`\`\`\`;
        const analysis = await queryLLM(filePrompt, PROMPTS.code);
        
        finalDoc += \`### \${relPath}\\n\\n\${analysis}\\n\\n\`;
        console.log('✅');
      } catch (err) {
        console.log('❌ خطا');
      }
    }

    // Phase 3: Save
    const outputPath = path.join(process.cwd(), 'DOCUMENTATION.md');
    await fs.writeFile(outputPath, finalDoc);
    console.log(\`\\n🎉 مستندات با موفقیت ذخیره شد در: \${outputPath}\`);

  } catch (error) {
    console.error('🔥 خطای بحرانی:', error);
    process.exit(1);
  }
}

main();`;

  const indexJsContent = part1 + part2;

  const copyToClipboard = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* File Card 1 */}
      <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-yellow-100 p-2 rounded-xl text-yellow-700 font-mono text-xs font-bold">JSON</div>
             <h3 className="text-lg font-bold text-slate-800 text-left dir-ltr">package.json</h3>
          </div>
          <button 
            onClick={() => copyToClipboard(packageJsonContent, setCopiedPackage)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            {copiedPackage ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copiedPackage ? 'کپی شد' : 'کپی کد'}
          </button>
        </div>
        <div className="relative group">
           <div className="absolute top-4 right-4 flex gap-1.5 z-10">
              <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
           </div>
           <pre className="bg-[#1E293B] p-6 rounded-2xl overflow-x-auto text-sm font-mono text-emerald-300 text-left dir-ltr shadow-inner shadow-black/30">
             {packageJsonContent}
           </pre>
        </div>
      </div>

      {/* File Card 2 */}
      <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-xl text-blue-700 font-mono text-xs font-bold">JS</div>
             <h3 className="text-lg font-bold text-slate-800 text-left dir-ltr">index.js</h3>
          </div>
          <button 
            onClick={() => copyToClipboard(indexJsContent, setCopiedIndex)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            {copiedIndex ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copiedIndex ? 'کپی شد' : 'کپی کد'}
          </button>
        </div>
        <div className="relative">
           <pre className="bg-[#1E293B] p-6 rounded-2xl overflow-x-auto text-sm font-mono text-blue-300 h-[30rem] text-left dir-ltr shadow-inner shadow-black/30 custom-scrollbar">
             {indexJsContent}
           </pre>
        </div>
      </div>

      {/* Instruction Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2rem] text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
        {/* Abstract circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
           <div className="bg-white/10 p-2.5 rounded-xl"><Terminal className="w-6 h-6" /></div>
           <h4 className="font-bold text-lg">راهنمای سریع اجرا</h4>
        </div>
        <ul className="space-y-4 relative z-10">
          {[
            'یک پوشه جدید بسازید و فایل‌های بالا را در آن ذخیره کنید.',
            'دستور npm install را اجرا کنید تا وابستگی‌ها نصب شوند.',
            'مطمئن شوید سرویس Ollama در پس‌زمینه در حال اجراست.',
            'مدل مورد نظر (مثلاً qwen2.5-coder) را پول (pull) کنید.',
            'با دستور node index.js مسیر پروژه خود را تحلیل کنید.'
          ].map((item, i) => (
             <li key={i} className="flex items-start gap-4 text-slate-300 text-sm">
                <span className="bg-white/10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0 border border-white/5">{i+1}</span>
                <span className="leading-relaxed">{item}</span>
             </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CliCodeViewer;