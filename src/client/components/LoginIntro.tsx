import { useEffect, useRef } from "react";
import {
  ACESFilmicToneMapping,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { BoschLogoMark } from "./BoschLogo";

export const LOGIN_INTRO_DURATION = 2600;
export const LOGIN_INTRO_STORAGE_KEY = "play-login-intro";
export const LOGO_EXTRUDE_OPTIONS = {
  depth: 14,
  steps: 1,
  curveSegments: 64,
  bevelEnabled: true,
  bevelThickness: 2,
  bevelSize: 1.4,
  bevelSegments: 12,
} as const;

const SPIN_SHARE = 0.65;
const LOGO_VIEWBOX_WIDTH = 433;
const LOGO_VIEWBOX_HEIGHT = 97;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

export function loginIntroFrame(elapsed: number) {
  const progress = clamp(elapsed / LOGIN_INTRO_DURATION);
  const spin = clamp(progress / SPIN_SHARE);
  const morph = smoothstep(clamp((progress - SPIN_SHARE) / (1 - SPIN_SHARE)));
  const angle = Math.PI * 2 * easeInOutCubic(spin);

  return {
    angle,
    tilt: Math.sin(angle) * 0.3 * (1 - morph),
    roll: Math.sin(angle * 0.5) * 0.12 * (1 - morph),
    morph,
    opacity: 1 - smoothstep(clamp((morph - 0.72) / 0.28)),
    done: progress >= 1,
  };
}

export function requestLoginIntro() {
  try {
    window.sessionStorage.setItem(LOGIN_INTRO_STORAGE_KEY, "1");
  } catch {
    // Web storage can be disabled; login must still work without the intro.
  }
}

export function loginIntroRequested() {
  try {
    return window.sessionStorage.getItem(LOGIN_INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearLoginIntroRequest() {
  try {
    window.sessionStorage.removeItem(LOGIN_INTRO_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

function buildLogoGeometry(logo: SVGSVGElement) {
  const clone = logo.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");

  const geometries: BufferGeometry[] = [];
  for (const path of new SVGLoader().parse(new XMLSerializer().serializeToString(clone)).paths) {
    for (const shape of path.toShapes()) {
      const geometry = new ExtrudeGeometry(shape, LOGO_EXTRUDE_OPTIONS);
      geometry.rotateX(Math.PI);
      const colors = new Float32Array(geometry.getAttribute("position").count * 3);
      for (let index = 0; index < colors.length; index += 3) {
        colors[index] = path.color.r;
        colors[index + 1] = path.color.g;
        colors[index + 2] = path.color.b;
      }
      geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
      geometries.push(geometry);
    }
  }

  const merged = mergeGeometries(geometries);
  geometries.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error("Bosch logo geometry creation failed");

  if (!merged.getAttribute("position").count) {
    merged.dispose();
    throw new Error("Bosch logo geometry is empty");
  }
  merged.translate(
    -LOGO_VIEWBOX_WIDTH / 2,
    LOGO_VIEWBOX_HEIGHT / 2,
    LOGO_EXTRUDE_OPTIONS.depth / 2,
  );
  merged.computeBoundingSphere();
  return { geometry: merged, width: LOGO_VIEWBOX_WIDTH };
}

export function LoginIntro({ onComplete }: { onComplete: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const canvas = canvasRef.current;
    const logo = logoRef.current;
    if (!backdrop || !canvas || !logo) return onComplete();

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return onComplete();

    let stopped = false;
    let animationFrame = 0;
    let resizeHandler: (() => void) | null = null;
    let targetLogo: SVGSVGElement | null = null;
    let renderer: WebGLRenderer | null = null;
    let geometry: BufferGeometry | null = null;
    let material: MeshPhysicalMaterial | null = null;
    let environment: Texture | null = null;

    const finish = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(animationFrame);
      onComplete();
    };
    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) finish();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      finish();
    };
    const safetyTimeout = window.setTimeout(finish, 4000);

    motionPreference.addEventListener("change", handleMotionChange);
    canvas.addEventListener("webglcontextlost", handleContextLost);

    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        failIfMajorPerformanceCaveat: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      const scene = new Scene();
      const camera = new PerspectiveCamera(35, 1, 0.1, 2000);
      camera.position.z = 700;

      const room = new RoomEnvironment();
      const pmrem = new PMREMGenerator(renderer);
      environment = pmrem.fromScene(room).texture;
      scene.environment = environment;
      room.dispose();
      pmrem.dispose();

      const keyLight = new DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(-3, 5, 7);
      scene.add(keyLight);
      const rimLight = new DirectionalLight(0x9fcfff, 1.8);
      rimLight.position.set(5, -2, 4);
      scene.add(rimLight);

      const built = buildLogoGeometry(logo);
      geometry = built.geometry;
      material = new MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.7,
        metalness: 0.92,
        roughness: 0.14,
        side: DoubleSide,
        vertexColors: true,
      });
      const object = new Mesh(geometry, material);
      scene.add(object);

      const headerLogo = document.querySelector<SVGSVGElement>(".header-brand-logo svg");
      if (!headerLogo) throw new Error("Header Bosch logo is unavailable");
      targetLogo = headerLogo;
      headerLogo.style.visibility = "hidden";

      const targetPosition = new Vector3();
      let startScale = 1;
      let targetScale = 0.1;
      const resize = () => {
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const target = headerLogo.getBoundingClientRect();

        renderer!.setPixelRatio(ratio);
        renderer!.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        const visibleHeight = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const worldPerPixel = visibleHeight / height;
        startScale = Math.min(width * 0.72, 900) * worldPerPixel / built.width;
        targetScale = target.width * worldPerPixel / built.width;
        targetPosition.set(
          ((target.left + target.width / 2) / width * 2 - 1) * visibleHeight * camera.aspect / 2,
          (1 - (target.top + target.height / 2) / height * 2) * visibleHeight / 2,
          0,
        );
      };
      resize();
      resizeHandler = resize;
      window.addEventListener("resize", resize);

      const startedAt = performance.now();
      const draw = (now: number) => {
        if (stopped || !renderer || !material) return;
        const frame = loginIntroFrame(now - startedAt);
        const scale = MathUtils.lerp(startScale, targetScale, frame.morph);

        backdrop.style.opacity = String(frame.opacity);
        object.position.copy(targetPosition).multiplyScalar(frame.morph);
        object.rotation.set(frame.tilt, frame.angle, frame.roll);
        object.scale.set(scale, scale, scale * Math.max(0.001, 1 - frame.morph));
        material.metalness = MathUtils.lerp(0.92, 0.05, frame.morph);
        material.roughness = MathUtils.lerp(0.14, 0.8, frame.morph);
        material.clearcoat = MathUtils.lerp(1, 0.05, frame.morph);
        renderer.render(scene, camera);

        if (frame.done) {
          window.removeEventListener("resize", resize);
          resizeHandler = null;
          finish();
        } else {
          animationFrame = requestAnimationFrame(draw);
        }
      };

      draw(startedAt);
      logo.style.opacity = "0";
    } catch (error) {
      console.warn("WebGL login intro skipped", error);
      finish();
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      clearTimeout(safetyTimeout);
      motionPreference.removeEventListener("change", handleMotionChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (targetLogo) targetLogo.style.visibility = "";
      environment?.dispose();
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  }, [onComplete]);

  return (
    <div className="login-intro" aria-hidden="true">
      <div ref={backdropRef} className="login-intro__backdrop" />
      <BoschLogoMark ref={logoRef} className="login-intro__source" />
      <canvas ref={canvasRef} className="login-intro__canvas" aria-hidden="true" />
    </div>
  );
}
