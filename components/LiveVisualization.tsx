import React, { useMemo, useState, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, MeshTransmissionMaterial, Float, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { CodeSymbol, ArchViolation } from '../types';
import { ShieldAlert, Skull, Activity, Info, X, Box, Network, Layers } from 'lucide-react';

// Removed manual declaration of JSX.IntrinsicElements to avoid conflicting with/overwriting standard React JSX types.
// This fixes errors like "Property 'div' does not exist on type 'JSX.IntrinsicElements'".

interface LiveVisualizationProps {
  knowledgeGraph: Record<string, CodeSymbol>;
  archViolations: ArchViolation[];
  zombieFiles: string[];
}

// --- 3D CITY COMPONENTS ---

const Building = ({ position, size, color, isZombie, onClick, label, isSelected }: any) => {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((state, delta) => {
    if (mesh.current && isSelected) {
      mesh.current.rotation.y += delta;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        position={[0, size[1] / 2, 0]} // Pivot at bottom
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial 
            color={isZombie ? '#475569' : (hovered || isSelected) ? '#f472b6' : color} 
            transparent 
            opacity={isZombie ? 0.8 : 1}
            roughness={isZombie ? 1 : 0.2}
            metalness={isZombie ? 0 : 0.6}
        />
      </mesh>
      {(hovered || isSelected) && (
          <Text position={[0, size[1] + 1, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
              {label}
          </Text>
      )}
    </group>
  );
};

const CityScene = ({ data, onNodeClick, selectedNodeId }: any) => {
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[20, 30, 20]} intensity={1.5} />
            <spotLight position={[-10, 50, -10]} angle={0.3} />
            
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
                <gridHelper args={[200, 50, '#1e293b', '#0f172a']} rotation={[-Math.PI/2, 0, 0]} />
            </mesh>

            {data.map((node: any, idx: number) => (
                <Building 
                    key={idx}
                    position={[node.x, 0, node.z]}
                    size={[node.width, node.height, node.width]}
                    color={node.color}
                    isZombie={node.isZombie}
                    label={node.name}
                    onClick={() => onNodeClick(node)}
                    isSelected={selectedNodeId === node.id}
                />
            ))}
            
            <OrbitControls 
                enablePan={true} 
                enableZoom={true} 
                enableRotate={true}
                maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going under ground
            />
        </>
    );
};

// --- 3D ARCHITECTURAL LAYERS (STACK) COMPONENTS ---

const LayerPlate = ({ position, color, label, children }: any) => {
    return (
        <group position={position}>
            {/* Floating Label */}
            <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
                 <Text 
                    position={[-7, 0.5, 0]} 
                    fontSize={0.8} 
                    color={color} 
                    anchorX="right" 
                    anchorY="middle"
                    font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff" // Fallback font
                 >
                    {label}
                </Text>
            </Float>

            {/* Glass Plate */}
            <mesh receiveShadow castShadow>
                <boxGeometry args={[12, 0.5, 12]} />
                {/* @ts-ignore - MeshTransmissionMaterial is valid in drei */}
                <MeshTransmissionMaterial 
                    backside
                    samples={4}
                    thickness={2}
                    chromaticAberration={0.06}
                    anisotropy={0.1}
                    distortion={0.0}
                    distortionScale={0.3}
                    temporalDistortion={0.5}
                    clearcoat={1}
                    attenuationDistance={0.5}
                    attenuationColor={color}
                    color="#ffffff"
                    background={new THREE.Color("#0f172a")}
                />
            </mesh>
            
            {/* Wireframe border for tech look */}
            <lineSegments position={[0, 0, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(12, 0.5, 12)]} />
                <lineBasicMaterial color={color} transparent opacity={0.3} />
            </lineSegments>

            {/* Nodes sitting on top */}
            <group position={[0, 0.5, 0]}>
                {children}
            </group>
        </group>
    );
};

const FileOrb = ({ position, color, label, onClick, isSelected }: any) => {
    const [hovered, setHover] = useState(false);
    
    // Spring animation logic could be added here, simplified for now
    const scale = hovered || isSelected ? 1.5 : 1;

    return (
        <group position={position}>
            <Float speed={5} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh 
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    scale={[scale, scale, scale]}
                >
                    <sphereGeometry args={[0.3, 32, 32]} />
                    <meshStandardMaterial 
                        color={color} 
                        emissive={color}
                        emissiveIntensity={hovered || isSelected ? 2 : 0.5}
                        toneMapped={false}
                    />
                </mesh>
            </Float>
            {(hovered || isSelected) && (
                <Text position={[0, 0.8, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor="#000">
                    {label}
                </Text>
            )}
        </group>
    );
};

const ArchitectureStackScene = ({ data, onNodeClick, selectedNodeId }: any) => {
    return (
        <>
            <color attach="background" args={['#050505']} />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-10, 10, -10]} intensity={2} color="#4c1d95" />
            
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Sparkles count={50} scale={20} size={4} speed={0.4} opacity={0.5} color="#8b5cf6" />

            <group position={[0, -2, 0]}>
                {data.map((layer: any, i: number) => (
                    <LayerPlate 
                        key={layer.id} 
                        position={[0, i * 4, 0]} // Vertical Stacking
                        color={layer.color} 
                        label={layer.label}
                    >
                        {layer.nodes.map((node: any, j: number) => (
                            <FileOrb 
                                key={node.id}
                                position={[node.x, 0, node.z]}
                                color={node.color}
                                label={node.name}
                                onClick={() => onNodeClick(node)}
                                isSelected={selectedNodeId === node.id}
                            />
                        ))}
                    </LayerPlate>
                ))}
            </group>

            <OrbitControls 
                autoRotate={true}
                autoRotateSpeed={0.5}
                enablePan={true} 
                enableZoom={true} 
                maxPolarAngle={Math.PI / 1.5}
            />
        </>
    );
};

// --- MAIN COMPONENT ---

const LiveVisualization: React.FC<LiveVisualizationProps> = ({ knowledgeGraph, archViolations, zombieFiles }) => {
  const [viewMode, setViewMode] = useState<'graph' | 'city' | 'layers'>('graph');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }
  }, []);

  // Process Data for Graph (2D)
  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const symbolList = Object.values(knowledgeGraph) as CodeSymbol[];

    symbolList.forEach(sym => {
      const isZombie = zombieFiles.includes(sym.filePath);
      const violation = archViolations.find(v => v.filePath === sym.filePath);
      const isCritical = violation?.severity === 'critical';
      
      // WEIGHT CALCULATION: Incoming + Outgoing connections
      // This is the key fix for "Bigger nodes for more connections"
      const degree = (sym.relationships.calledBy.length || 0) + (sym.relationships.calls.length || 0);
      const baseSize = 4;
      const sizeMultiplier = 1.5;
      const val = baseSize + (degree * sizeMultiplier);
      
      let group = 'normal';
      let color = '#8b5cf6'; 

      if (isZombie) { group = 'zombie'; color = '#94a3b8'; } 
      else if (isCritical) { group = 'critical'; color = '#ef4444'; } 
      else if (violation) { group = 'warning'; color = '#f59e0b'; } 
      else if (degree > 10) { group = 'hub'; color = '#fbbf24'; } // High traffic nodes are Amber
      else if (sym.kind === 'class') { color = '#38bdf8'; } 
      else if (sym.kind === 'endpoint') { color = '#22c55e'; }

      nodes.push({
        id: sym.id,
        name: sym.name,
        val: val, // Dynamic Size
        color,
        group,
        filePath: sym.filePath,
        snippet: sym.codeSnippet,
        kind: sym.kind,
        isZombie,
        violation,
        complexity: sym.complexityScore || 1,
        degree
      });

      sym.relationships.calls.forEach(targetId => {
        if (knowledgeGraph[targetId]) {
            links.push({ source: sym.id, target: targetId, color: isZombie ? '#cbd5e1' : '#e2e8f0' });
        }
      });
    });

    return { nodes, links };
  }, [knowledgeGraph, archViolations, zombieFiles]);

  // Process Data for City (3D)
  const cityData = useMemo(() => {
      const symbolList = Object.values(knowledgeGraph) as CodeSymbol[];
      // Sort by Path to group directories
      symbolList.sort((a, b) => a.filePath.localeCompare(b.filePath));

      const buildings: any[] = [];
      const SPACING = 3;
      const GRID_SIZE = Math.ceil(Math.sqrt(symbolList.length));
      
      symbolList.forEach((sym, idx) => {
          const isZombie = zombieFiles.includes(sym.filePath);
          const lines = sym.codeSnippet.split('\n').length;
          
          // Layout Logic: Spiral or Grid
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          
          // Mapping Visual Properties
          const height = Math.max(1, (sym.complexityScore || 1) * 1.5); // Height = Complexity
          const width = Math.max(1, Math.min(5, Math.sqrt(lines) * 0.5)); // Width/Area = Lines
          
          let color = '#8b5cf6';
          if (sym.filePath.endsWith('.ts') || sym.filePath.endsWith('.tsx')) color = '#38bdf8'; // Blue for TS
          else if (sym.filePath.endsWith('.js')) color = '#facc15'; // Yellow for JS
          else if (sym.filePath.endsWith('.css')) color = '#f472b6'; // Pink for CSS
          else if (sym.filePath.endsWith('.py')) color = '#4ade80'; // Green for Python

          buildings.push({
              id: sym.id,
              name: sym.name,
              x: (col - GRID_SIZE/2) * SPACING,
              z: (row - GRID_SIZE/2) * SPACING,
              height,
              width,
              color,
              isZombie,
              filePath: sym.filePath,
              snippet: sym.codeSnippet,
              kind: sym.kind,
              complexity: sym.complexityScore,
              violation: archViolations.find(v => v.filePath === sym.filePath)
          });
      });
      return buildings;
  }, [knowledgeGraph, archViolations, zombieFiles]);

  // Process Data for Layers (3D Stack)
  const layersData = useMemo(() => {
    const symbolList = Object.values(knowledgeGraph) as CodeSymbol[];
    
    // Define Layers
    const layersDefinition = [
        { id: 'ui', label: 'UI / Components', keywords: ['component', 'page', 'view', 'layout', 'ui'], color: '#38bdf8' }, // Cyan
        { id: 'logic', label: 'Business Logic / Hooks', keywords: ['hook', 'context', 'store', 'reducer', 'logic'], color: '#a78bfa' }, // Purple
        { id: 'core', label: 'Services / API', keywords: ['service', 'api', 'controller', 'handler', 'route'], color: '#facc15' }, // Yellow
        { id: 'data', label: 'Utils / Types / Config', keywords: ['util', 'helper', 'type', 'interface', 'model', 'config', 'schema'], color: '#4ade80' } // Green
    ];

    const layers: any[] = layersDefinition.map(l => ({ ...l, nodes: [] }));
    const miscLayer = { id: 'misc', label: 'Modules / Others', color: '#94a3b8', nodes: [] as any[] };

    symbolList.forEach(sym => {
        const path = sym.filePath.toLowerCase();
        let placed = false;
        
        // Find matching layer based on path keyword
        for (const layer of layers) {
            if (layer.keywords.some((k: string) => path.includes(k))) {
                // Random position on the plate (Plate size is 12x12)
                const x = (Math.random() - 0.5) * 10;
                const z = (Math.random() - 0.5) * 10;
                
                layer.nodes.push({
                    ...sym,
                    x, z,
                    color: layer.color
                });
                placed = true;
                break;
            }
        }

        if (!placed) {
            const x = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 10;
            miscLayer.nodes.push({ ...sym, x, z, color: '#94a3b8' });
        }
    });

    // Return layers that have content, plus misc if not empty
    const finalLayers = layers.filter(l => l.nodes.length > 0);
    if (miscLayer.nodes.length > 0) finalLayers.push(miscLayer);
    
    // Reverse so UI is on top
    return finalLayers;
  }, [knowledgeGraph]);


  const handleNodeClick = (node: any) => {
      setSelectedNode(node);
  };

  return (
    <div className="flex h-full gap-4 relative">
      {/* View Switcher & Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-4">
          <div className="bg-slate-900/90 backdrop-blur p-1 rounded-xl border border-slate-700 shadow-xl flex gap-1">
              <button 
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'graph' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  <Network className="w-4 h-4" /> گراف عصبی
              </button>
              <button 
                onClick={() => setViewMode('layers')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'layers' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  <Layers className="w-4 h-4" /> معماری لایه‌ای
              </button>
              <button 
                onClick={() => setViewMode('city')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'city' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                  <Box className="w-4 h-4" /> شهر کد
              </button>
          </div>

          <div className="bg-slate-900/90 backdrop-blur text-white p-4 rounded-2xl border border-slate-700 shadow-xl max-w-xs animate-in slide-in-from-left duration-500">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-400" />
                {viewMode === 'graph' ? 'اکوسیستم زنده' : viewMode === 'layers' ? 'معماری ماژولار' : 'شهر کد'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {viewMode === 'graph' 
                    ? 'نمایش روابط بین اجزای سیستم. گره‌های بزرگتر نشان‌دهنده وابستگی‌های بیشتر (اتصالات ورودی/خروجی) هستند.'
                    : viewMode === 'layers' 
                    ? 'نمایش تفکیک لایه‌های نرم‌افزار. هر طبقه شیشه‌ای نشان‌دهنده یک لایه معماری (UI, Logic, Services) است.'
                    : 'ارتفاع ساختمان = پیچیدگی کد. مساحت ساختمان = تعداد خطوط.'
                }
            </p>
            
            <div className="space-y-2 text-xs">
                {viewMode === 'layers' ? (
                     <>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"></div>
                            <span>UI / Components (Top)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]"></div>
                            <span>Hooks / Logic</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                            <span>Services / API</span>
                        </div>
                     </>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]`}></div>
                            <span>گره استاندارد</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                            <span>هسته مرکزی (Hub)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                            <span>تداخل معماری (Critical)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-500 border border-slate-400"></div>
                            <span>کد مرده / متروکه (Zombie)</span>
                        </div>
                    </>
                )}
            </div>
          </div>
      </div>

      {/* Main Render Area */}
      <div ref={containerRef} className="flex-1 bg-[#0f172a] rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-inner relative">
         
         {viewMode === 'graph' ? (
             <>
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>
                <ForceGraph2D
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeLabel="name"
                    nodeColor="color"
                    // Size is now primarily driven by calculated 'val' which is based on degree
                    nodeRelSize={1} 
                    nodeVal="val"
                    // Adjust physics for larger nodes
                    d3VelocityDecay={0.3}
                    d3AlphaDecay={0.02}
                    cooldownTicks={100}
                    
                    linkColor={link => (link as any).color}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={d => 0.005}
                    backgroundColor="rgba(0,0,0,0)"
                    onNodeClick={handleNodeClick}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = 12/globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        
                        // Draw Node Body
                        ctx.beginPath();
                        const r = Math.sqrt(Math.max(0, node.val || 1)) * 4; // Visual radius scaling
                        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                        ctx.fillStyle = node.color;
                        ctx.fill();

                        // Glow / Pulse for Hubs or Critical
                        if (node.group === 'critical' || node.degree > 10) {
                            const time = Date.now();
                            const pulse = Math.sin(time / 200) * 2 + 2; 
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, r + pulse, 0, 2 * Math.PI, false);
                            ctx.strokeStyle = node.color;
                            ctx.lineWidth = 1.5 / globalScale;
                            ctx.globalAlpha = 0.4;
                            ctx.stroke();
                            ctx.globalAlpha = 1;
                        }

                        // Text Label Logic
                        // Always show label for hubs or zoomed in
                        const showLabel = globalScale > 1.5 || node.degree > 5 || node === selectedNode;
                        
                        if (showLabel) {
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = '#fff';
                            // Offset label below node
                            ctx.fillText(label, node.x, node.y + r + 4);
                        }
                    }}
                />
             </>
         ) : viewMode === 'layers' ? (
             <Canvas camera={{ position: [20, 10, 20], fov: 45 }}>
                 <ArchitectureStackScene data={layersData} onNodeClick={handleNodeClick} selectedNodeId={selectedNode?.id} />
             </Canvas>
         ) : (
             <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
                 <CityScene data={cityData} onNodeClick={handleNodeClick} selectedNodeId={selectedNode?.id} />
             </Canvas>
         )}
      </div>

      {/* Details Sidebar (Slide-over) */}
      {selectedNode && (
         <div className="w-80 bg-white border-r border-slate-200 shadow-2xl rounded-l-[2rem] p-6 overflow-y-auto animate-in slide-in-from-right duration-300 absolute right-0 top-0 bottom-0 z-20">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        selectedNode.isZombie ? 'bg-slate-100 text-slate-500' : 
                        selectedNode.violation ? 'bg-red-100 text-red-600' : 
                        'bg-brand-50 text-brand-600'
                    }`}>
                        {selectedNode.kind || 'Module'}
                    </span>
                    <h2 className="text-xl font-black text-slate-800 mt-2 break-all">{selectedNode.name}</h2>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="w-5 h-5" />
                </button>
             </div>

             <div className="space-y-6">
                 {/* Metadata */}
                 <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-slate-600">
                     <div className="flex justify-between">
                         <span className="text-slate-400">File Path:</span>
                         <span className="font-mono dir-ltr truncate max-w-[150px]" title={selectedNode.filePath}>{selectedNode.filePath.split('/').pop()}</span>
                     </div>
                     <div className="flex justify-between">
                         <span className="text-slate-400">Connections:</span>
                         <span className="font-bold">{selectedNode.degree}</span>
                     </div>
                     <div className="flex justify-between">
                         <span className="text-slate-400">Complexity:</span>
                         <span className="font-bold">{Math.round(selectedNode.complexity || 1)}</span>
                     </div>
                 </div>

                 {/* Alerts */}
                 {selectedNode.isZombie && (
                     <div className="bg-slate-100 p-4 rounded-xl flex items-start gap-3 text-slate-600">
                         <Skull className="w-5 h-5 shrink-0" />
                         <div>
                             <h4 className="font-bold text-sm">کد مرده (Zombie Code)</h4>
                             <p className="text-xs mt-1 leading-relaxed">این قطعه کد توسط هیچ بخش دیگری از برنامه فراخوانی نشده و مانند یک ساختمان متروکه است.</p>
                         </div>
                     </div>
                 )}

                 {selectedNode.violation && (
                     <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 text-red-600 border border-red-100">
                         <ShieldAlert className="w-5 h-5 shrink-0" />
                         <div>
                             <h4 className="font-bold text-sm">تداخل معماری</h4>
                             <p className="text-xs mt-1 leading-relaxed">{selectedNode.violation.description}</p>
                         </div>
                     </div>
                 )}

                 {/* Snippet */}
                 <div>
                     <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                         <Info className="w-4 h-4" /> کد منبع
                     </h4>
                     <pre className="bg-[#1e293b] text-slate-300 p-4 rounded-xl text-[10px] font-mono overflow-x-auto custom-scrollbar dir-ltr max-h-60">
                         {selectedNode.snippet}
                     </pre>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default LiveVisualization;