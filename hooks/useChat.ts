
import React, { useState, useEffect } from 'react';
import { ChatMessage, OllamaConfig, CodeSymbol } from '../types';
import { LocalVectorStore } from '../services/vectorStore';
import { sendChatRequest } from '../services/ollamaService';

const CHAT_STORAGE_KEY = 'rayan_chat_history';
const DEFAULT_SYSTEM_MSG: ChatMessage = { role: 'system', content: 'شما یک دستیار هوشمند برنامه‌نویسی هستید. پاسخ‌ها باید کوتاه، دقیق و حرفه‌ای باشند.' };

/**
 * Custom React Hook for managing the interactive chat session.
 * Integrates with Vector Store (RAG) and the Knowledge Graph to provide context-aware answers.
 */
export const useChat = (
    config: OllamaConfig, 
    vectorStoreRef: React.MutableRefObject<LocalVectorStore | null>, 
    hasContext: boolean,
    knowledgeGraph: Record<string, CodeSymbol>,
    docParts: Record<string, string>,
    projectId: string // Added prop
) => {
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [DEFAULT_SYSTEM_MSG];
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [DEFAULT_SYSTEM_MSG];
    } catch { return [DEFAULT_SYSTEM_MSG]; }
  });

  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput;
    const newUserMessage: ChatMessage = { role: 'user', content: userText };
    setChatMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      let contextSegments: string[] = [];
      
      // 1. GLOBAL CONTEXT INJECTION
      if (docParts.root) {
          const summary = docParts.root.substring(0, 2000);
          contextSegments.push(`*** PROJECT OVERVIEW (README) ***\n${summary}`);
      }
      if (docParts.arch) {
          const archSum = docParts.arch.substring(0, 1500);
          contextSegments.push(`*** ARCHITECTURE SUMMARY ***\n${archSum}`);
      }

      // 2. SYMBOL SNIFFING
      if (knowledgeGraph && Object.keys(knowledgeGraph).length > 0) {
          const knownNames = Object.values(knowledgeGraph);
          const matchedSymbols = knownNames.filter(sym => 
              sym.name.length > 3 && userText.includes(sym.name)
          );

          if (matchedSymbols.length > 0) {
              const symbolContext = matchedSymbols.slice(0, 3).map(s => 
                  `> EXPLICIT SYMBOL MATCH: ${s.name} (${s.kind})\nFile: ${s.filePath}\nCode:\n\`\`\`\n${s.codeSnippet}\n\`\`\``
              ).join('\n\n');
              contextSegments.push(`*** DIRECT CODE MATCHES ***\n${symbolContext}`);
          }
      }

      // 3. VECTOR RETRIEVAL (RAG)
      // Updated to use server-side search via projectId
      if (hasContext && vectorStoreRef.current && projectId) {
         setIsRetrieving(true);
         try {
             // New API: search(projectId, query, k)
             const relevantDocs = await vectorStoreRef.current.search(projectId, userText, 5);

             const vectorChunks = relevantDocs.map(d => {
                return `FILEPATH: ${d.metadata.filePath}\nCONTENT:\n\`\`\`\n${d.content}\n\`\`\``;
             }).join('\n\n----------------\n\n');

             if (vectorChunks) {
                 contextSegments.push(`*** RETRIEVED SIMILAR CHUNKS ***\n${vectorChunks}`);
             }
         } catch (e) {
             console.error("RAG Search failed", e);
         }
         setIsRetrieving(false);
      }

      const fullContext = contextSegments.join('\n\n================================\n\n');

      const systemMessage: ChatMessage = { 
         role: 'system', 
         content: `You are 'Rayan', a Senior Code Assistant dedicated to THIS specific project.
         
         STRICT RULES:
         1. **Answer based on the "PROJECT SOURCE CODE CONTEXT" provided below.**
         2. The context includes the README, Architecture, and specific code snippets. USE THEM.
         3. If the user asks "What is this project?", refer to the PROJECT OVERVIEW section.
         4. If the user asks about a class (e.g. DataListService), check the DIRECT CODE MATCHES section.
         5. Always answer in **Persian (Farsi)**.
         6. Use Markdown formatting.
         
         CONTEXT START:
         ${fullContext || 'No context found. The user might not have indexed the repo yet.'}
         CONTEXT END`
      };

      const messagesToSend = [systemMessage, ...chatMessages.filter(m => m.role !== 'system'), newUserMessage];
      const responseContent = await sendChatRequest(config, messagesToSend);
      setChatMessages(prev => [...prev, { role: 'assistant', content: responseContent }]);
    } catch (error) {
      console.error(error);
      setIsRetrieving(false);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '**خطا در ارتباط با سرور.**' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return { chatMessages, chatInput, setChatInput, isChatLoading, isRetrieving, handleSendMessage };
};
