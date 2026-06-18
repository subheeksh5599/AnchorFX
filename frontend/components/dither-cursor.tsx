"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, extend, createPortal } from "@react-three/fiber";
import { useFBO, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

const SimulationMaterial = shaderMaterial(
  {
    uTime: 0,
    uMouse: new THREE.Vector2(0, 0),
    uPreviousState: null,
    uResolution: new THREE.Vector2(0, 0),
    uRadius: 0.1,
    uDecay: 0.01,
    uIntensity: 1.0,
    uSpeed: 0.0,
    uDirection: new THREE.Vector2(0, 0),
  },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform sampler2D uPreviousState;
    uniform vec2 uResolution;
    uniform float uRadius;
    uniform float uDecay;
    uniform float uIntensity;
    uniform float uSpeed;
    uniform vec2 uDirection;

    varying vec2 vUv;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    vec2 curl(vec2 p) {
      float eps = 0.1;
      float n1 = snoise(p + vec2(0, eps));
      float n2 = snoise(p - vec2(0, eps));
      float n3 = snoise(p + vec2(eps, 0));
      float n4 = snoise(p - vec2(eps, 0));
      return vec2((n3 - n4) / (2.0 * eps), -(n1 - n2) / (2.0 * eps));
    }

    void main() {
      vec2 uv = vUv;
      vec2 texel = 1.0 / uResolution;
      vec2 velocity = curl(uv * 0.5 + uTime * 0.1);
      vec2 advectedUV = uv - velocity * 0.001;
      
      float prev = texture2D(uPreviousState, advectedUV).r;
      float top = texture2D(uPreviousState, advectedUV + vec2(0.0, texel.y)).r;
      float bottom = texture2D(uPreviousState, advectedUV - vec2(0.0, texel.y)).r;
      float left = texture2D(uPreviousState, advectedUV - vec2(texel.x, 0.0)).r;
      float right = texture2D(uPreviousState, advectedUV + vec2(texel.x, 0.0)).r;
      float diffused = (prev + top + bottom + left + right) * 0.2;
      
      float aspect = uResolution.x / uResolution.y;
      float dist = length((uv - uMouse) * vec2(aspect, 1.0));
      float brush = exp(-pow(dist / uRadius, 2.0)) * uIntensity * smoothstep(0.0, 0.01, uSpeed) * 0.5;
      
      float value = min(0.95, diffused + brush) - uDecay;
      gl_FragColor = vec4(vec3(max(0.0, value)), 1.0);
    }
  `
);

const DitherMaterial = shaderMaterial(
  {
    uSimulationState: null,
    uDitherSize: 8.0,
    uExponent: 2.0,
    uResolution: new THREE.Vector2(0, 0),
    uColor: new THREE.Vector3(0, 0, 0),
    uOpacity: 1.0,
    uPixelRatio: 1.0,
  },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform sampler2D uSimulationState;
    uniform float uDitherSize;
    uniform float uExponent;
    uniform vec2 uResolution;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uPixelRatio;

    varying vec2 vUv;

    float bayer8(vec2 uv) {
      int x = int(mod(uv.x, 8.0));
      int y = int(mod(uv.y, 8.0));
      int M[64];
      M[0]=0;  M[1]=32; M[2]=8;  M[3]=40; M[4]=2;  M[5]=34; M[6]=10; M[7]=42;
      M[8]=48; M[9]=16; M[10]=56;M[11]=24;M[12]=50;M[13]=18;M[14]=58;M[15]=26;
      M[16]=12;M[17]=44;M[18]=4; M[19]=36;M[20]=14;M[21]=46;M[22]=6; M[23]=38;
      M[24]=60;M[25]=28;M[26]=52;M[27]=20;M[28]=62;M[29]=30;M[30]=54;M[31]=22;
      M[32]=3; M[33]=35;M[34]=11;M[35]=43;M[36]=1; M[37]=33;M[38]=9; M[39]=41;
      M[40]=51;M[41]=19;M[42]=59;M[43]=27;M[44]=49;M[45]=17;M[46]=57;M[47]=25;
      M[48]=15;M[49]=47;M[50]=7; M[51]=39;M[52]=13;M[53]=45;M[54]=5; M[55]=37;
      M[56]=63;M[57]=31;M[58]=55;M[59]=23;M[60]=61;M[61]=29;M[62]=53;M[63]=21;
      return float(M[y * 8 + x]) / 64.0;
    }

    void main() {
      float signal = pow(texture2D(uSimulationState, vUv).r, uExponent);
      float threshold = bayer8(gl_FragCoord.xy / (uDitherSize * uPixelRatio));
      float mask = signal < 0.01 ? 0.0 : step(threshold, signal);
      gl_FragColor = vec4(uColor, mask * uOpacity);
    }
  `
);

extend({ SimulationMaterial, DitherMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    simulationMaterial: ThreeElements["shaderMaterial"];
    ditherMaterial: ThreeElements["shaderMaterial"];
  }
}

interface SimulationUniforms {
  uTime: number;
  uMouse: THREE.Vector2;
  uPreviousState: THREE.Texture | null;
  uResolution: THREE.Vector2;
  uRadius: number;
  uDecay: number;
  uIntensity: number;
  uSpeed: number;
  uDirection: THREE.Vector2;
}

interface DitherUniforms {
  uSimulationState: THREE.Texture | null;
  uDitherSize: number;
  uExponent: number;
  uResolution: THREE.Vector2;
  uColor: THREE.Vector3;
  uOpacity: number;
  uPixelRatio: number;
}

interface SceneProps {
  simulationScene: THREE.Scene;
  ditherSize: number;
  radius: number;
  exponent: number;
  decay: number;
  intensity: number;
  color: string;
  opacity: number;
}

function SceneInternal({
  simulationScene,
  ditherSize,
  radius,
  exponent,
  decay,
  intensity,
  color,
  opacity,
}: SceneProps) {
  const { size, viewport, gl } = useThree();
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const prevMouseRef = useRef(new THREE.Vector2(0, 0));
  const speedRef = useRef(0);
  const resolutionRef = useRef(new THREE.Vector2());
  const directionRef = useRef(new THREE.Vector2());
  const colorRef = useRef(new THREE.Vector3());
  
  const pixelRatio = gl.getPixelRatio();
  const normalizedRadius = useMemo(() => radius * (1080 / size.height), [radius, size.height]);

  const parsedColor = useMemo(() => {
    const hex = color.replace("#", "");
    return {
      r: parseInt(hex.substring(0, 2), 16) / 255,
      g: parseInt(hex.substring(2, 4), 16) / 255,
      b: parseInt(hex.substring(4, 6), 16) / 255,
    };
  }, [color]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.set(
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height
      );
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [gl.domElement]);
  
  const simTargetA = useFBO({ minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const simTargetB = useFBO({ minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  
  const simMaterialRef = useRef<THREE.ShaderMaterial & SimulationUniforms>(null);
  const ditherMaterialRef = useRef<THREE.ShaderMaterial & DitherUniforms>(null);
  const frameRef = useRef(0);

  useFrame((state) => {
    const { gl, clock, camera } = state;
    const isEven = frameRef.current % 2 === 0;
    const writeBuffer = isEven ? simTargetA : simTargetB;
    const readBuffer = isEven ? simTargetB : simTargetA;
    
    if (simMaterialRef.current) {
      const sim = simMaterialRef.current;
      sim.uTime = clock.elapsedTime;
      sim.uMouse = mouseRef.current;
      sim.uPreviousState = readBuffer.texture;
      resolutionRef.current.set(size.width, size.height);
      sim.uResolution = resolutionRef.current;
      sim.uRadius = normalizedRadius;
      sim.uDecay = decay;
      sim.uIntensity = intensity;
      
      const dist = mouseRef.current.distanceTo(prevMouseRef.current);
      speedRef.current += (dist - speedRef.current) * 0.1;
      sim.uSpeed = speedRef.current;
      
      directionRef.current.subVectors(mouseRef.current, prevMouseRef.current).normalize();
      sim.uDirection = directionRef.current;
      
      prevMouseRef.current.copy(mouseRef.current);
    }
    
    gl.setRenderTarget(writeBuffer);
    gl.render(simulationScene, camera);
    gl.setRenderTarget(null);
    
    if (ditherMaterialRef.current) {
      const dither = ditherMaterialRef.current;
      dither.uSimulationState = writeBuffer.texture;
      dither.uDitherSize = ditherSize;
      dither.uExponent = exponent;
      resolutionRef.current.set(size.width, size.height);
      dither.uResolution = resolutionRef.current;
      dither.uPixelRatio = pixelRatio;
      colorRef.current.set(parsedColor.r, parsedColor.g, parsedColor.b);
      dither.uColor = colorRef.current;
      dither.uOpacity = opacity;
    }
    
    frameRef.current++;
  });

  return (
    <>
      {createPortal(
        <mesh>
          <planeGeometry args={[viewport.width, viewport.height]} />
          <simulationMaterial ref={simMaterialRef} />
        </mesh>,
        simulationScene
      )}
      <mesh>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <ditherMaterial ref={ditherMaterialRef} transparent />
      </mesh>
    </>
  );
}

export interface DitherCursorProps {
  ditherSize?: number;
  radius?: number;
  exponent?: number;
  decay?: number;
  intensity?: number;
  color?: string;
  className?: string;
  opacity?: number;
  position?: "fixed" | "absolute";
}

export default function DitherCursor({
  ditherSize = 3.0,
  radius = 0.075,
  exponent = 3.0,
  decay = 0.005,
  intensity = 0.5,
  color = "#ffd900",
  className,
  opacity = 1,
  position = "fixed",
}: DitherCursorProps) {
  const simulationScene = useMemo(() => new THREE.Scene(), []);

  return (
    <div 
      className={cn(
        position === "fixed" ? "fixed" : "absolute",
        "inset-0 w-full h-full pointer-events-none z-0",
        className
      )}
    >
      <Canvas
        orthographic
        camera={{ zoom: 1, position: [0, 0, 1], near: 0.1, far: 1000 }}
        gl={{ alpha: true, antialias: false, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <SceneInternal 
          simulationScene={simulationScene}
          ditherSize={ditherSize}
          radius={radius}
          exponent={exponent}
          decay={decay}
          intensity={intensity}
          color={color}
          opacity={opacity}
        />
      </Canvas>
    </div>
  );
}
