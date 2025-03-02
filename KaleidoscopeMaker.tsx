import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface PatternPreset {
  name: string;
  iterations: number;
  symmetry: number;
  complexity: number;
  rotationSpeed: number;
  harmonicScale: number;
  spiralFactor: number;
}

const KaleidoscopeMaker: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<number | null>(null);
  const uniformsRef = useRef<any>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  const [showControls, setShowControls] = useState<boolean>(true);
  const [speedFactor, setSpeedFactor] = useState<number>(1.0);
  const [iterations, setIterations] = useState<number>(5);
  const [symmetry, setSymmetry] = useState<number>(5);
  const [complexity, setComplexity] = useState<number>(20);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.1);
  const [color1, setColor1] = useState<string>('#4080ff');
  const [color2, setColor2] = useState<string>('#ff4080');
  const [edgeIntensity, setEdgeIntensity] = useState<number>(0.5);
  const [glowIntensity, setGlowIntensity] = useState<number>(0.3);
  const [harmonicScale, setHarmonicScale] = useState<number>(20);
  const [spiralFactor, setSpiralFactor] = useState<number>(5);
  const [patternMix, setPatternMix] = useState<number>(0.5);
  const [currentPreset, setCurrentPreset] = useState<string>('classic');
  
  const presets: Record<string, PatternPreset> = {
    classic: { 
      name: 'クラシック万華鏡', 
      iterations: 5, 
      symmetry: 5, 
      complexity: 20, 
      rotationSpeed: 0.1,
      harmonicScale: 20,
      spiralFactor: 5
    },
    crystal: { 
      name: 'クリスタルスター', 
      iterations: 3, 
      symmetry: 8, 
      complexity: 30, 
      rotationSpeed: 0.05,
      harmonicScale: 15,
      spiralFactor: 8
    },
    vortex: { 
      name: '渦巻き銀河', 
      iterations: 4, 
      symmetry: 2, 
      complexity: 15, 
      rotationSpeed: 0.15,
      harmonicScale: 10,
      spiralFactor: 12
    },
    fractal: { 
      name: 'フラクタル迷路', 
      iterations: 8, 
      symmetry: 3, 
      complexity: 25, 
      rotationSpeed: 0.08,
      harmonicScale: 25,
      spiralFactor: 3
    },
    flower: { 
      name: '万華花', 
      iterations: 6, 
      symmetry: 6, 
      complexity: 18, 
      rotationSpeed: 0.12,
      harmonicScale: 12,
      spiralFactor: 6
    }
  };
  
  const applyPreset = (presetName: string) => {
    if (presets[presetName]) {
      const preset = presets[presetName];
      setIterations(preset.iterations);
      setSymmetry(preset.symmetry);
      setComplexity(preset.complexity);
      setRotationSpeed(preset.rotationSpeed);
      setHarmonicScale(preset.harmonicScale);
      setSpiralFactor(preset.spiralFactor);
      setCurrentPreset(presetName);
    }
  };
  
  const hsvToRgb = (h: number, s: number, v: number) => {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    let r, g, b;
    switch (i % 6) {
      case 0: [r, g, b] = [v, t, p]; break;
      case 1: [r, g, b] = [q, v, p]; break;
      case 2: [r, g, b] = [p, v, t]; break;
      case 3: [r, g, b] = [p, q, v]; break;
      case 4: [r, g, b] = [t, p, v]; break;
      case 5: [r, g, b] = [v, p, q]; break;
      default: [r, g, b] = [0, 0, 0];
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };
  
  const updateShaderColors = () => {
    if (!uniformsRef.current) return;
    
    const parseColor = (hexColor: string) => {
      const r = parseInt(hexColor.slice(1, 3), 16) / 255;
      const g = parseInt(hexColor.slice(3, 5), 16) / 255;
      const b = parseInt(hexColor.slice(5, 7), 16) / 255;
      return new THREE.Vector3(r, g, b);
    };
    
    uniformsRef.current.u_color1.value = parseColor(color1);
    uniformsRef.current.u_color2.value = parseColor(color2);
  };
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    
    const fragmentShader = `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speedFactor;
      uniform int u_iterations;
      uniform float u_symmetry;
      uniform float u_complexity;
      uniform float u_rotationSpeed;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform float u_edgeIntensity;
      uniform float u_glowIntensity;
      uniform float u_harmonicScale;
      uniform float u_spiralFactor;
      uniform float u_patternMix;
      
      #define PI 3.14159265359
      
      vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      vec2 cmul(vec2 a, vec2 b) {
          return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
      }
      
      vec2 cexp(vec2 z) {
          return vec2(exp(z.x) * cos(z.y), exp(z.x) * sin(z.y));
      }
      
      float harmonicPattern(vec2 p, float scale, float t) {
          return 0.5 + 0.5 * sin(length(p) * scale - t);
      }
      
      float spiralPattern(vec2 p, float spiralFactor, float t) {
          float angle = atan(p.y, p.x);
          float r = length(p);
          return 0.5 + 0.5 * sin(r * 10.0 - angle * spiralFactor + t);
      }
      
      vec2 rotate(vec2 p, float a) {
          float c = cos(a);
          float s = sin(a);
          return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      }
      
      vec2 iteratedFunction(vec2 p, float t, int iterations, float symmetry, float rotSpeed) {
          for(int i = 0; i < 10; i++) {
              if (i >= iterations) break;
              
              p = abs(p) / dot(p, p) - 0.5;
              
              float rotAngle = t * rotSpeed + float(i) * 0.1 + (2.0 * PI / symmetry);
              p = rotate(p, rotAngle);
              
              p = cmul(p, cexp(vec2(0.0, t * 0.1)));
          }
          return p;
      }
      
      vec2 kaleidoscope(vec2 p, float segments) {
          float angle = atan(p.y, p.x);
          float segmentAngle = 2.0 * PI / segments;
          float baseAngle = floor(angle / segmentAngle) * segmentAngle;
          float relativeAngle = angle - baseAngle;
          
          if (mod(floor(angle / segmentAngle), 2.0) >= 1.0) {
              relativeAngle = segmentAngle - relativeAngle;
          }
          
          float len = length(p);
          return vec2(len * cos(relativeAngle + baseAngle), len * sin(relativeAngle + baseAngle));
      }
      
      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
          
          float t = u_time * u_speedFactor;
          
          vec2 kUv = kaleidoscope(uv, u_symmetry);
          
          vec2 p = rotate(kUv, t * u_rotationSpeed);
          
          vec2 q = iteratedFunction(p, t, u_iterations, u_symmetry, u_rotationSpeed);
          
          float pattern1 = harmonicPattern(q, u_harmonicScale, t * 2.0);
          float pattern2 = spiralPattern(q, u_spiralFactor, t);
          
          float finalPattern = mix(pattern1, pattern2, u_patternMix + 0.5 * sin(t * 0.2));
          
          float edgePattern = 0.5 + 0.5 * sin(finalPattern * u_complexity);
          edgePattern = pow(edgePattern, 10.0);
          
          vec3 color = mix(
              u_color1,
              u_color2,
              clamp(finalPattern * 2.0 - 0.5, 0.0, 1.0)
          );
          
          color += vec3(1.0) * edgePattern * u_edgeIntensity;
          
          float depth = length(q) * 0.5;
          color *= 1.0 + depth;
          
          float bgDepth = length(uv) * 0.5;
          
          vec3 bgColor = hsv2rgb(vec3(0.7, 0.5, 0.1 * bgDepth));
          color = mix(bgColor, color, (finalPattern * 0.8 + 0.2) * (1.0 - bgDepth * 0.5));
          
          float sharpEdge = abs(sin(finalPattern * 50.0 + t));
          sharpEdge = pow(sharpEdge, 20.0);
          color += vec3(1.0, 0.8, 0.5) * sharpEdge * u_glowIntensity;
          
          gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;
    
    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_speedFactor: { value: speedFactor },
      u_iterations: { value: iterations },
      u_symmetry: { value: symmetry },
      u_complexity: { value: complexity },
      u_rotationSpeed: { value: rotationSpeed },
      u_color1: { value: new THREE.Vector3(0.25, 0.5, 1.0) },
      u_color2: { value: new THREE.Vector3(1.0, 0.25, 0.5) },
      u_edgeIntensity: { value: edgeIntensity },
      u_glowIntensity: { value: glowIntensity },
      u_harmonicScale: { value: harmonicScale },
      u_spiralFactor: { value: spiralFactor },
      u_patternMix: { value: patternMix }
    };
    
    uniformsRef.current = uniforms;
    
    updateShaderColors();
    
    const material = new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });
    
    materialRef.current = material;
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    const animate = (time: number) => {
      uniforms.u_time.value = time * 0.001;
      renderer.render(scene, camera);
      requestIdRef.current = requestAnimationFrame(animate);
    };
    
    requestIdRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);
  
  useEffect(() => {
    if (!uniformsRef.current) return;
    
    uniformsRef.current.u_speedFactor.value = speedFactor;
    uniformsRef.current.u_iterations.value = iterations;
    uniformsRef.current.u_symmetry.value = symmetry;
    uniformsRef.current.u_complexity.value = complexity;
    uniformsRef.current.u_rotationSpeed.value = rotationSpeed;
    uniformsRef.current.u_edgeIntensity.value = edgeIntensity;
    uniformsRef.current.u_glowIntensity.value = glowIntensity;
    uniformsRef.current.u_harmonicScale.value = harmonicScale;
    uniformsRef.current.u_spiralFactor.value = spiralFactor;
    uniformsRef.current.u_patternMix.value = patternMix;
    
    updateShaderColors();
  }, [
    speedFactor, iterations, symmetry, complexity, rotationSpeed, 
    color1, color2, edgeIntensity, glowIntensity, harmonicScale, 
    spiralFactor, patternMix
  ]);
  
  const toggleControls = () => {
    setShowControls(!showControls);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 relative h-screen w-full overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      <Button
        onClick={toggleControls}
        className="absolute z-10 m-2"
        style={{
          top: '10px',
          insetInlineEnd: showControls ? '310px' : '10px',
          transition: 'right 0.3s ease, inset-inline-end 0.3s ease'
        }}
      >
        {showControls ? '→' : '←'}
      </Button>
      
      <Card
        className="bg-card absolute h-full overflow-y-auto"
        style={{
          insetInlineEnd: 0,
          width: showControls ? '300px' : '0',
          transition: 'width 0.3s ease',
          opacity: showControls ? 1 : 0
        }}
      >
        <CardHeader className="bg-card">
          <CardTitle className="bg-card text-center">万華鏡メーカー</CardTitle>
        </CardHeader>
        
        <CardContent className="bg-card space-y-4">
          {showControls && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-2">プリセット:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(presets).map(presetKey => (
                    <Button
                      key={presetKey}
                      onClick={() => applyPreset(presetKey)}
                      variant={currentPreset === presetKey ? "default" : "outline"}
                      className="text-xs py-1 h-auto"
                    >
                      {presets[presetKey].name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-2">基本設定</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="speed" className="text-xs">
                      アニメーション速度: {speedFactor.toFixed(1)}
                    </Label>
                    <input 
                      id="speed"
                      type="range" 
                      min="0.1" 
                      max="3" 
                      step="0.1"
                      value={speedFactor}
                      onChange={(e) => setSpeedFactor(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="symmetry" className="text-xs">
                      対称性: {symmetry}分割
                    </Label>
                    <input 
                      id="symmetry"
                      type="range" 
                      min="2" 
                      max="20" 
                      step="1"
                      value={symmetry}
                      onChange={(e) => setSymmetry(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="rotation" className="text-xs">
                      回転速度: {rotationSpeed.toFixed(2)}
                    </Label>
                    <input 
                      id="rotation"
                      type="range" 
                      min="0" 
                      max="0.3" 
                      step="0.01"
                      value={rotationSpeed}
                      onChange={(e) => setRotationSpeed(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-2">パターン設定</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="iterations" className="text-xs">
                      反復回数: {iterations}
                    </Label>
                    <input 
                      id="iterations"
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      value={iterations}
                      onChange={(e) => setIterations(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="complexity" className="text-xs">
                      複雑さ: {complexity}
                    </Label>
                    <input 
                      id="complexity"
                      type="range" 
                      min="5" 
                      max="50" 
                      step="1"
                      value={complexity}
                      onChange={(e) => setComplexity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="harmonic" className="text-xs">
                      ハーモニックスケール: {harmonicScale.toFixed(1)}
                    </Label>
                    <input 
                      id="harmonic"
                      type="range" 
                      min="5" 
                      max="40" 
                      step="0.5"
                      value={harmonicScale}
                      onChange={(e) => setHarmonicScale(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="spiral" className="text-xs">
                      スパイラル係数: {spiralFactor.toFixed(1)}
                    </Label>
                    <input 
                      id="spiral"
                      type="range" 
                      min="1" 
                      max="20" 
                      step="0.5"
                      value={spiralFactor}
                      onChange={(e) => setSpiralFactor(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mix" className="text-xs">
                      パターンミックス: {patternMix.toFixed(2)}
                    </Label>
                    <input 
                      id="mix"
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={patternMix}
                      onChange={(e) => setPatternMix(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-2">色と効果</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="color1" className="text-xs">
                      カラー1:
                    </Label>
                    <input 
                      id="color1"
                      type="color" 
                      value={color1}
                      onChange={(e) => setColor1(e.target.value)}
                      className="w-full h-8"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="color2" className="text-xs">
                      カラー2:
                    </Label>
                    <input 
                      id="color2"
                      type="color" 
                      value={color2}
                      onChange={(e) => setColor2(e.target.value)}
                      className="w-full h-8"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edge" className="text-xs">
                      エッジ強度: {edgeIntensity.toFixed(2)}
                    </Label>
                    <input 
                      id="edge"
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={edgeIntensity}
                      onChange={(e) => setEdgeIntensity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="glow" className="text-xs">
                      グロー強度: {glowIntensity.toFixed(2)}
                    </Label>
                    <input 
                      id="glow"
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      value={glowIntensity}
                      onChange={(e) => setGlowIntensity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KaleidoscopeMaker;