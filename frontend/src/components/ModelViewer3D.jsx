import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCw, Maximize2, Sparkles, Eye, Shield, Cpu, Mail, Box } from 'lucide-react';

export const DAKLY_MODELS = [
  {
    id: 'envelope',
    name: 'Quantum OTP Envelope',
    badge: 'Hero Asset',
    icon: Mail,
    url: '/models/futuristic_otp_envelope_v2.glb',
    description: 'Translucent frosted-glass envelope with internal holographic OTP core and emerald delivery checkmark.'
  },
  {
    id: 'router',
    name: 'Failover Microservice Router',
    badge: 'Core Engine',
    icon: Cpu,
    url: '/models/decentralized_microservice_router.glb',
    description: 'Multi-node cluster router orchestrating automatic Gmail quota failover.'
  },
  {
    id: 'shield',
    name: 'Bounce Guard Shield',
    badge: 'Deliverability',
    icon: Shield,
    url: '/models/cyber_security_shield_deliverability.glb',
    description: 'Cybernetic defense barrier blocking invalid emails and suppressing hard bounces.'
  },
  {
    id: 'cube',
    name: 'Modular Tech Core',
    badge: 'Low-Poly Web',
    icon: Box,
    url: '/models/modular_tech_cube_lowpoly.glb',
    description: 'Lightweight modular isometric cube with live telemetry ports.'
  }
];

export default function ModelViewer3D({
  initialModelId = 'envelope',
  height = '380px',
  showSwitcher = true,
  autoRotateSpeed = 1.8,
  className = ''
}) {
  const containerRef = useRef(null);
  const [activeModelId, setActiveModelId] = useState(initialModelId);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [error, setError] = useState(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const currentModelRef = useRef(null);
  const reqIdRef = useRef(null);

  const activeModel = DAKLY_MODELS.find(m => m.id === activeModelId) || DAKLY_MODELS[0];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 380;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.5, 2, 3.5);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 8;
    controlsRef.current = controls;

    // 5. Lighting tuned for Dakly Cyber Dark Aesthetic
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    // Electric Indigo accent rim light (#6366F1)
    const indigoLight = new THREE.PointLight(0x6366f1, 3.5, 10);
    indigoLight.position.set(-3, 2, -2);
    scene.add(indigoLight);

    // Cyber Emerald accent rim light (#10B981)
    const emeraldLight = new THREE.PointLight(0x10b981, 3.0, 10);
    emeraldLight.position.set(3, -1, 2);
    scene.add(emeraldLight);

    // Subtle violet top spotlight
    const topSpot = new THREE.SpotLight(0xa855f7, 2.0);
    topSpot.position.set(0, 5, 0);
    topSpot.angle = Math.PI / 4;
    scene.add(topSpot);

    // 6. Animation loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // Update autoRotate when state changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Load active .glb model
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    setLoading(true);
    setLoadProgress(0);
    setError(null);

    // Remove previous model
    if (currentModelRef.current) {
      scene.remove(currentModelRef.current);
      currentModelRef.current.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      currentModelRef.current = null;
    }

    const loader = new GLTFLoader();
    loader.load(
      activeModel.url,
      (gltf) => {
        const model = gltf.scene;

        // Auto-fit & Auto-center model in viewport
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 2.0 / (maxDim || 1);
        model.scale.setScalar(targetScale);

        // Center offset
        model.position.x = -center.x * targetScale;
        model.position.y = -center.y * targetScale;
        model.position.z = -center.z * targetScale;

        // Enhance material settings
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = Math.min(child.material.roughness ?? 0.3, 0.45);
              child.material.metalness = Math.max(child.material.metalness ?? 0.2, 0.25);
            }
          }
        });

        scene.add(model);
        currentModelRef.current = model;
        setLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.error('Failed to load 3D GLB model:', err);
        setError('Could not load 3D model asset.');
        setLoading(false);
      }
    );
  }, [activeModelId]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-gradient-to-b from-slate-900/60 via-[#07090f]/90 to-slate-950/90 shadow-2xl backdrop-blur-md ${className}`}>
      
      {/* Top Model Switcher Header */}
      {showSwitcher && (
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 z-10 relative bg-slate-950/40">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  {activeModel.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {activeModel.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm sm:max-w-md hidden sm:block">
                {activeModel.description}
              </p>
            </div>
          </div>

          {/* Model Selection Pills */}
          <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
            {DAKLY_MODELS.map((m) => {
              const Icon = m.icon;
              const isActive = m.id === activeModelId;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModelId(m.id)}
                  title={m.name}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{m.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full relative cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center"
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07090e]/80 backdrop-blur-xs z-20 space-y-3">
            <div className="relative flex h-10 w-10">
              <span className="radar-beacon absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-10 w-10 bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-500/50">
                <Sparkles className="w-5 h-5 text-white animate-spin" />
              </span>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-white">Loading 3D Model...</div>
              <div className="text-[10px] font-mono text-indigo-400 mt-0.5">
                {loadProgress > 0 ? `${loadProgress}%` : 'Parsing geometry'}
              </div>
            </div>
          </div>
        )}

        {/* Error Fallback */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07090e]/90 z-20 text-center p-4">
            <div className="text-xs text-rose-400 font-semibold">{error}</div>
            <button
              onClick={() => setActiveModelId(activeModelId)}
              className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Floating 3D Interaction Control HUD */}
      <div className="absolute bottom-3 right-3 flex items-center space-x-1.5 z-10 bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 text-slate-300 text-xs">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-lg transition ${
            autoRotate ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-white/10 text-slate-400'
          }`}
          title={autoRotate ? 'Pause auto-rotation' : 'Start auto-rotation'}
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        </button>

        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
          title="Reset camera view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] font-mono text-slate-400 px-1 border-l border-white/10 flex items-center space-x-1">
          <Eye className="w-3 h-3 text-emerald-400" />
          <span>Interactive 3D</span>
        </span>
      </div>

      {/* Instructions Pill on bottom left */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:block">
        <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-xs border border-white/5 text-[10px] text-slate-400 font-mono">
          Drag to orbit • Scroll to zoom
        </span>
      </div>
    </div>
  );
}
