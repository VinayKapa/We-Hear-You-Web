import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  User, 
  Smile,
  Compass,
  Check,
  Eye,
  HandMetal
} from 'lucide-react';
import { SignToken } from '../types';
import { useTheme } from '../context/ThemeContext';

interface Avatar3DProps {
  signTokens?: SignToken[];
  currentGloss?: string;
  facialExpression?: string;
  isSigning?: boolean;
  onAnimationComplete?: () => void;
  height?: string;
  playbackKey?: string | number;
}

interface BoneRigMap {
  head?: THREE.Bone;
  neck?: THREE.Bone;
  spine?: THREE.Bone;
  spine1?: THREE.Bone;
  spine2?: THREE.Bone;
  leftShoulder?: THREE.Bone;
  leftArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  leftHand?: THREE.Bone;
  leftThumb?: THREE.Bone[];
  leftIndex?: THREE.Bone[];
  leftMiddle?: THREE.Bone[];
  leftRing?: THREE.Bone[];
  leftPinky?: THREE.Bone[];
  rightShoulder?: THREE.Bone;
  rightArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
  rightHand?: THREE.Bone;
  rightThumb?: THREE.Bone[];
  rightIndex?: THREE.Bone[];
  rightMiddle?: THREE.Bone[];
  rightRing?: THREE.Bone[];
  rightPinky?: THREE.Bone[];
}

const AVATAR_MODEL_CONFIG = {
  id: 'realistic_avatar',
  name: 'Avatar',
  tag: 'Photorealistic 3D Humanoid',
  url: '/models/readyplayer.me.glb',
  scale: 1.05,
  yOffset: -0.92,
  camDistance: 1.85,
};

const QUICK_GESTURE_PRESETS: { label: string; gloss: string; meaning: string; tokens: SignToken[] }[] = [
  {
    label: 'Namaste 🙏',
    gloss: 'NAMASTE',
    meaning: 'Respectful Indian greeting: palms pressed at heart center with gentle bowing head',
    tokens: [{ gloss: 'NAMASTE', meaning: 'Indian greeting with pressed palms at heart center', durationSec: 1.8 }],
  },
  {
    label: 'Thank You ✨',
    gloss: 'THANK-YOU',
    meaning: 'Flat hand touches chin and gracefully sweeps forward toward you with a polite nod',
    tokens: [{ gloss: 'THANK-YOU', meaning: 'Hand touches chin and moves gracefully forward', durationSec: 1.6 }],
  },
  {
    label: 'Yes / Agree 👍',
    gloss: 'YES',
    meaning: 'Fist nodding twice at chest with affirming head nods',
    tokens: [{ gloss: 'YES', meaning: 'Affirmative agreement sign with dual nodding fist', durationSec: 1.4 }],
  },
  {
    label: 'No / Disagree ✋',
    gloss: 'NO',
    meaning: 'Hand waving side-to-side with decisive head shake and furrowed brow',
    tokens: [{ gloss: 'NO', meaning: 'Polite negative / decline gesture with head shake', durationSec: 1.4 }],
  },
  {
    label: 'Platform 3 🚉',
    gloss: 'PLATFORM 3',
    meaning: 'Platform track base glide + distinct 3-finger handshape + forward direction',
    tokens: [
      { gloss: 'PLATFORM', meaning: 'Horizontal train platform surface glide', durationSec: 1.3 },
      { gloss: '3', meaning: 'Indian Sign Language number 3 gesture', durationSec: 1.2 },
      { gloss: 'STRAIGHT', meaning: 'Pointing straight ahead toward platform', durationSec: 1.2 },
    ],
  },
  {
    label: 'Doctor 🩺',
    gloss: 'DOCTOR',
    meaning: 'Two extended fingers tapping left inner radial pulse twice',
    tokens: [
      { gloss: 'DOCTOR', meaning: 'Two fingers tapping inner wrist radial pulse', durationSec: 1.5 },
      { gloss: 'HELP', meaning: 'Left palm elevating thumbs-up fist in support', durationSec: 1.4 },
    ],
  },
  {
    label: 'Water 💧',
    gloss: 'WATER',
    meaning: 'Authentic W-handshape gently tapping corner of lip twice with slight sipping tilt',
    tokens: [{ gloss: 'WATER', meaning: 'W-handshape tapping lip for drinking water', durationSec: 1.5 }],
  },
  {
    label: 'Time ⏳',
    gloss: 'TIME',
    meaning: 'Index finger tapping the back of left wrist watch twice',
    tokens: [{ gloss: 'TIME', meaning: 'Tapping wrist watch twice for train schedule', durationSec: 1.4 }],
  },
  {
    label: 'Welcome 🤝',
    gloss: 'WELCOME',
    meaning: 'Both arms open wide with palms up, sweeping inward in warm invitation',
    tokens: [{ gloss: 'WELCOME', meaning: 'Bimanual cordial welcome gesture with warm smile', durationSec: 1.6 }],
  },
  {
    label: 'I Love You 🤟',
    gloss: 'I-LOVE-YOU',
    meaning: 'Thumb, index, and pinky extended high, pushing forward affectionately',
    tokens: [{ gloss: 'I-LOVE-YOU', meaning: 'Universal ILY sign with extended thumb, index, pinky', durationSec: 1.5 }],
  },
  {
    label: 'Help / Assist 🆘',
    gloss: 'HELP',
    meaning: 'Left open palm elevating right thumbs-up fist upward in unison',
    tokens: [{ gloss: 'HELP', meaning: 'Left palm elevating right fist upward in support', durationSec: 1.5 }],
  },
  {
    label: 'Please 🙏',
    gloss: 'PLEASE',
    meaning: 'Right open palm rubbing in gentle circles over center chest',
    tokens: [{ gloss: 'PLEASE', meaning: 'Circular rubbing over heart for polite request', durationSec: 1.5 }],
  },
  {
    label: 'Where / What? ❓',
    gloss: 'WHERE',
    meaning: 'Both palms held forward and open with shoulder shrug and furrowed brow',
    tokens: [{ gloss: 'WHERE', meaning: 'Inquisitive shrugging palms-up question gesture', durationSec: 1.4 }],
  },
  {
    label: 'Understood 👌',
    gloss: 'UNDERSTOOD',
    meaning: 'Clean OK mudra with index and thumb touching, pulsing forward with head nod',
    tokens: [{ gloss: 'UNDERSTOOD', meaning: 'Affirmative OK sign with agreeing nod', durationSec: 1.4 }],
  },
  {
    label: 'Write Down ✍️',
    gloss: 'WRITE',
    meaning: 'Left palm notepad with right hand mimicking pen scribbling across',
    tokens: [{ gloss: 'WRITE', meaning: 'Writing with imaginary pen across left palm notepad', durationSec: 1.5 }],
  },
  {
    label: 'Emergency 🚨',
    gloss: 'EMERGENCY',
    meaning: 'Both arms raised flashing forward with urgent alert posture',
    tokens: [{ gloss: 'EMERGENCY', meaning: 'Urgent emergency alert gesture', durationSec: 1.4 }],
  },
];

export const Avatar3D: React.FC<Avatar3DProps> = ({
  signTokens: propSignTokens = [],
  currentGloss: externalGloss,
  facialExpression = 'neutral',
  isSigning: externalIsSigning,
  onAnimationComplete,
  height = 'h-72 sm:h-96',
  playbackKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  // Model & Playback States
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [modelError, setModelError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeTokenIndex, setActiveTokenIndex] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [cameraView, setCameraView] = useState<'chest' | 'face' | 'full'>('chest');
  const [activePresetTokens, setActivePresetTokens] = useState<SignToken[] | null>(null);

  // Active sign tokens priority
  const signTokens = (propSignTokens && propSignTokens.length > 0) ? propSignTokens : (activePresetTokens || []);

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Current avatar references
  const currentModelGroup = useRef<THREE.Group | null>(null);
  const boneRigRef = useRef<BoneRigMap>({});
  const initialEulersRef = useRef<Map<THREE.Bone, THREE.Euler>>(new Map());
  const morphMeshesRef = useRef<THREE.Mesh[]>([]);

  const activeToken = signTokens.length > 0 ? signTokens[activeTokenIndex] : null;
  const displayGloss = activeToken?.gloss || externalGloss || (signTokens.length === 0 ? 'READY' : 'SIGNING');
  const displayMeaning = activeToken?.meaning || (signTokens.length === 0 ? 'Interactive Indian Sign Language (ISL) Avatar' : 'Translating in real-time');

  const tokenStartTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    tokenStartTimeRef.current = performance.now();
  }, [activeTokenIndex, isPlaying, displayGloss, playbackKey]);

  // Synchronized animation state ref to prevent stale closures in the Three.js render loop
  const animStateRef = useRef({
    displayGloss,
    displayMeaning,
    isPlaying,
    facialExpression,
    speed,
    activeTokenIndex,
    tokenCount: signTokens.length,
    tokenDuration: activeToken?.durationSec || 1.4,
    tokenStartTime: tokenStartTimeRef.current,
  });

  useEffect(() => {
    animStateRef.current = {
      displayGloss,
      displayMeaning,
      isPlaying,
      facialExpression,
      speed,
      activeTokenIndex,
      tokenCount: signTokens.length,
      tokenDuration: activeToken?.durationSec || 1.4,
      tokenStartTime: tokenStartTimeRef.current,
    };
  }, [displayGloss, displayMeaning, isPlaying, facialExpression, speed, activeTokenIndex, signTokens.length, activeToken?.durationSec]);

  // Set camera positions based on view
  const applyCameraView = (view: 'chest' | 'face' | 'full') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (view === 'chest') {
      // Focus on upper torso & hands for ISL signing clarity
      camera.position.set(0, 0.45, 1.45);
      controls.target.set(0, 0.35, 0);
    } else if (view === 'face') {
      // Close up on facial expressions and mouth
      camera.position.set(0, 0.55, 0.85);
      controls.target.set(0, 0.52, 0);
    } else {
      // Full view
      camera.position.set(0, 0.3, 2.2);
      controls.target.set(0, 0.1, 0);
    }
    controls.update();
  };

  useEffect(() => {
    applyCameraView(cameraView);
  }, [cameraView]);

  // Handle dark mode theme change in Three.js scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(isDark ? 0x0a0f1d : 0xf8fafc);
      if (sceneRef.current.fog) {
        sceneRef.current.fog.color.setHex(isDark ? 0x0a0f1d : 0xf8fafc);
      }
    }
  }, [isDark]);

  // Advance sign token timer
  useEffect(() => {
    if (!isPlaying || signTokens.length === 0) return;

    const currentDuration = ((activeToken?.durationSec || 1.3) * 1000) / speed;
    const timer = setTimeout(() => {
      if (activeTokenIndex < signTokens.length - 1) {
        setActiveTokenIndex((prev) => prev + 1);
      } else {
        // Animation sequence ended
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [isPlaying, activeTokenIndex, signTokens, speed, activeToken, onAnimationComplete]);

  // Track tokens sequence key so new sentences trigger immediate playback from token 0
  const tokensKey = (propSignTokens || []).map((t) => t.gloss).join('|') + `_${playbackKey || ''}`;
  const prevTokensKeyRef = useRef<string>('');

  // Reset index whenever new tokens or playbackKey arrive from props
  useEffect(() => {
    if (propSignTokens && propSignTokens.length > 0) {
      if (tokensKey !== prevTokensKeyRef.current) {
        prevTokensKeyRef.current = tokensKey;
        setActivePresetTokens(null);
        setActiveTokenIndex(0);
        setIsPlaying(true);
      }
    }
  }, [propSignTokens, tokensKey]);

  // Load realistic 3D GLTF Avatar into Three.js Scene
  const loadAvatarModel = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    setIsLoadingModel(true);
    setModelError(null);
    setLoadingProgress(15);

    // Remove existing model if present
    if (currentModelGroup.current) {
      scene.remove(currentModelGroup.current);
      currentModelGroup.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      currentModelGroup.current = null;
    }

    initialEulersRef.current.clear();
    morphMeshesRef.current = [];

    const loader = new GLTFLoader();

    loader.load(
      AVATAR_MODEL_CONFIG.url,
      (gltf) => {
        const root = gltf.scene;
        currentModelGroup.current = root;

        // Position & Scale
        root.scale.setScalar(AVATAR_MODEL_CONFIG.scale);
        root.position.set(0, AVATAR_MODEL_CONFIG.yOffset, 0);

        const rig: BoneRigMap = {
          leftThumb: [],
          leftIndex: [],
          leftMiddle: [],
          leftRing: [],
          leftPinky: [],
          rightThumb: [],
          rightIndex: [],
          rightMiddle: [],
          rightRing: [],
          rightPinky: [],
        };

        // Traverse scene to catalog bones, meshes, and morph targets
        root.traverse((node) => {
          if ((node as any).isBone) {
            const bone = node as THREE.Bone;
            initialEulersRef.current.set(bone, bone.rotation.clone());

            const name = bone.name.toLowerCase();

            // Match head & neck
            if (name.includes('head') && !name.includes('top') && !name.includes('end') && !name.includes('eye')) {
              rig.head = bone;
            } else if (name.includes('neck')) {
              rig.neck = bone;
            } else if (name.includes('spine') || name.includes('chest')) {
              if (!rig.spine) rig.spine = bone;
              else if (!rig.spine1) rig.spine1 = bone;
              else if (!rig.spine2) rig.spine2 = bone;
            }

            // Match left arm & hand
            if (name.includes('left')) {
              if (name.includes('shoulder') || name.includes('collar')) {
                rig.leftShoulder = bone;
              } else if (name.includes('forearm')) {
                rig.leftForeArm = bone;
              } else if (name.includes('arm') && !name.includes('fore')) {
                rig.leftArm = bone;
              } else if (name.includes('hand') && !name.includes('thumb') && !name.includes('index') && !name.includes('middle') && !name.includes('ring') && !name.includes('pinky')) {
                rig.leftHand = bone;
              } else if (name.includes('thumb')) {
                rig.leftThumb?.push(bone);
              } else if (name.includes('index')) {
                rig.leftIndex?.push(bone);
              } else if (name.includes('middle')) {
                rig.leftMiddle?.push(bone);
              } else if (name.includes('ring')) {
                rig.leftRing?.push(bone);
              } else if (name.includes('pinky')) {
                rig.leftPinky?.push(bone);
              }
            }

            // Match right arm & hand
            if (name.includes('right')) {
              if (name.includes('shoulder') || name.includes('collar')) {
                rig.rightShoulder = bone;
              } else if (name.includes('forearm')) {
                rig.rightForeArm = bone;
              } else if (name.includes('arm') && !name.includes('fore')) {
                rig.rightArm = bone;
              } else if (name.includes('hand') && !name.includes('thumb') && !name.includes('index') && !name.includes('middle') && !name.includes('ring') && !name.includes('pinky')) {
                rig.rightHand = bone;
              } else if (name.includes('thumb')) {
                rig.rightThumb?.push(bone);
              } else if (name.includes('index')) {
                rig.rightIndex?.push(bone);
              } else if (name.includes('middle')) {
                rig.rightMiddle?.push(bone);
              } else if (name.includes('ring')) {
                rig.rightRing?.push(bone);
              } else if (name.includes('pinky')) {
                rig.rightPinky?.push(bone);
              }
            }
          }

          // Enable shadows and gather morph targets
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Soften materials for natural human skin rendering
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              if (mat.roughness !== undefined) mat.roughness = Math.max(mat.roughness, 0.45);
            }

            if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
              morphMeshesRef.current.push(mesh);
            }
          }
        });

        boneRigRef.current = rig;
        scene.add(root);

        setIsLoadingModel(false);
        setLoadingProgress(100);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadingProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.warn('3D Avatar GLTF model load error:', err);
        setModelError('Could not load 3D GLTF avatar mesh.');
        setIsLoadingModel(false);
      }
    );
  };

  // Reset OrbitControls
  const handleResetControls = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      applyCameraView(cameraView);
    }
  };

  // Initialize Three.js Scene, Renderer & OrbitControls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const heightPx = container.clientHeight || 400;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(isDark ? 0x0a0f1d : 0xf8fafc);
    scene.fog = new THREE.FogExp2(isDark ? 0x0a0f1d : 0xf8fafc, 0.12);

    const camera = new THREE.PerspectiveCamera(42, width / heightPx, 0.1, 100);
    camera.position.set(0, 0.45, 1.45);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls for 360 rotation & zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.6;
    controls.maxDistance = 3.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(0, 0.35, 0);
    controlsRef.current = controls;

    // Three-Point Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.6);
    keyLight.position.set(2, 3, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.95);
    fillLight.position.set(-2.5, 2, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe0e7ff, 0.85);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Subtle Ground Shadow Disc
    const groundGeo = new THREE.CircleGeometry(2.5, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0e1726 : 0xe2e8f0,
      roughness: 0.85,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.92;
    ground.receiveShadow = true;
    scene.add(ground);

    // Load Avatar
    loadAvatarModel();

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Helpers to apply delta rotations to bones on top of their rest pose
    const applyDeltaEuler = (
      bone: THREE.Bone | undefined,
      dx: number,
      dy: number,
      dz: number,
      factor = 0.12
    ) => {
      if (!bone) return;
      const base = initialEulersRef.current.get(bone);
      if (!base) return;
      bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, base.x + dx, factor);
      bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, base.y + dy, factor);
      bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, base.z + dz, factor);
    };

    // Humanoid hand shape configurations
    interface HandPose {
      thumb?: number;
      thumbSpread?: number;
      index?: number;
      indexSpread?: number;
      middle?: number;
      middleSpread?: number;
      ring?: number;
      ringSpread?: number;
      pinky?: number;
      pinkySpread?: number;
    }

    const POSE_OPEN_PALM: HandPose = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
    const POSE_FIST: HandPose = { thumb: 0.85, index: 0.95, middle: 0.95, ring: 0.95, pinky: 0.95 };
    const POSE_THUMBS_UP: HandPose = { thumb: -0.35, thumbSpread: 0.3, index: 0.95, middle: 0.95, ring: 0.95, pinky: 0.95 };
    const POSE_POINT_INDEX: HandPose = { thumb: 0.75, index: 0, middle: 0.95, ring: 0.95, pinky: 0.95 };
    const POSE_TWO_FINGERS: HandPose = { thumb: 0.75, index: 0, middle: 0, ring: 0.95, pinky: 0.95, indexSpread: -0.04, middleSpread: 0.04 };
    const POSE_THREE_FINGERS: HandPose = { thumb: 0.8, thumbSpread: 0.35, index: 0, middle: 0, ring: 0, pinky: 0.95, indexSpread: -0.08, pinkySpread: 0.08 };
    const POSE_ILY: HandPose = { thumb: -0.32, thumbSpread: 0.35, index: 0, middle: 0.95, ring: 0.95, pinky: 0, pinkySpread: 0.12 };
    const POSE_OK: HandPose = { thumb: 0.52, index: 0.58, middle: 0, ring: 0, pinky: 0, middleSpread: -0.05, ringSpread: 0.05, pinkySpread: 0.1 };
    const POSE_RELAXED: HandPose = { thumb: 0.12, index: 0.16, middle: 0.2, ring: 0.22, pinky: 0.25 };
    const POSE_PINCH_PEN: HandPose = { thumb: 0.55, index: 0.62, middle: 0.72, ring: 0.85, pinky: 0.85 };

    // Apply natural cascading interphalangeal flexion to finger bones
    const applyHandPose = (side: 'right' | 'left', pose: HandPose, factor = 0.16) => {
      const rig = boneRigRef.current;
      const isRight = side === 'right';

      const applyPhalanges = (
        bones: THREE.Bone[] | undefined,
        curl: number,
        spread = 0,
        isThumb = false
      ) => {
        if (!bones || bones.length === 0) return;
        const phalangeMultipliers = isThumb ? [0.8, 1.0, 1.1] : [1.0, 1.25, 0.85];
        bones.forEach((b, idx) => {
          const base = initialEulersRef.current.get(b);
          if (!base) return;
          const mult = phalangeMultipliers[Math.min(idx, phalangeMultipliers.length - 1)];
          b.rotation.x = THREE.MathUtils.lerp(b.rotation.x, base.x + curl * mult, factor);

          if (idx === 0 && spread !== 0) {
            const spreadSign = isRight ? 1 : -1;
            b.rotation.z = THREE.MathUtils.lerp(b.rotation.z, base.z + spread * spreadSign, factor);
          }
        });
      };

      applyPhalanges(isRight ? rig.rightThumb : rig.leftThumb, pose.thumb ?? 0.12, pose.thumbSpread ?? 0, true);
      applyPhalanges(isRight ? rig.rightIndex : rig.leftIndex, pose.index ?? 0.16, pose.indexSpread ?? 0);
      applyPhalanges(isRight ? rig.rightMiddle : rig.leftMiddle, pose.middle ?? 0.2, pose.middleSpread ?? 0);
      applyPhalanges(isRight ? rig.rightRing : rig.leftRing, pose.ring ?? 0.22, pose.ringSpread ?? 0);
      applyPhalanges(isRight ? rig.rightPinky : rig.leftPinky, pose.pinky ?? 0.25, pose.pinkySpread ?? 0);
    };

    // Animation Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      controls.update();

      const rig = boneRigRef.current;

      if (rig.head) {
        // Read live synchronized animation state
        const {
          displayGloss: curGloss,
          isPlaying: curPlaying,
          facialExpression: curExpression,
          speed: curSpeed,
          tokenDuration: curTokenDuration,
          tokenStartTime: curTokenStartTime,
        } = animStateRef.current;

        // Normalized token timeline (0.0 to 1.0)
        const elapsedSinceStart = Math.max(0, (performance.now() - curTokenStartTime) / 1000);
        const effectiveDuration = Math.max(0.4, (curTokenDuration || 1.4) / Math.max(0.2, curSpeed));
        const progress = Math.min(1.0, elapsedSinceStart / effectiveDuration);

        // Natural subtle breathing motion & micro-sway
        const breathe = Math.sin(elapsedTime * 2.2) * 0.025;
        const microSway = Math.sin(elapsedTime * 1.1) * 0.008;

        // Natural periodic human blinking (every 3.8s for ~130ms)
        const blinkCycle = elapsedTime % 3.8;
        const isBlinking = blinkCycle < 0.13;
        const blinkTarget = isBlinking ? Math.sin((blinkCycle / 0.13) * Math.PI) : 0.0;

        const glossUpper = (curGloss || '').toUpperCase().trim();

        // Sign categorization for facial markers
        const isQuestion = ['WHERE', 'WHAT', 'WHY', 'HOW', 'WHEN', 'WHO', 'KAHAN', 'KYA', 'KAUN'].some((q) =>
          glossUpper.includes(q)
        );
        const isHappySign = ['NAMASTE', 'HELLO', 'THANK-YOU', 'THANK', 'WELCOME', 'GOOD', 'FINE', 'BADIYA', 'GREAT', 'LOVE'].some((w) =>
          glossUpper.includes(w)
        );
        const isNegativeSign = ['NO', 'NOT', 'NAHI', 'DISAGREE', 'CANCEL'].some((w) =>
          glossUpper.includes(w)
        );

        // Dynamic Facial Blendshapes
        for (const mesh of morphMeshesRef.current) {
          if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            const dict = mesh.morphTargetDictionary;
            const targetSmile = curExpression === 'happy' || isHappySign ? 0.8 : (isNegativeSign ? 0.05 : 0.18);
            const targetCheek = targetSmile * 0.45;
            const targetBrowDown = isQuestion ? 0.55 : (isNegativeSign ? 0.45 : 0.0);
            const targetBrowUp = isQuestion ? 0.35 : (isHappySign ? 0.25 : 0.05);
            const targetMouthOpen = curPlaying && curGloss !== 'READY' ? (Math.sin(elapsedTime * 6.5) > 0.2 ? 0.22 : 0.03) : 0.0;

            const setMorph = (name: string, targetVal: number, lerpRate = 0.12) => {
              const idx = dict[name];
              if (idx !== undefined) {
                mesh.morphTargetInfluences![idx] = THREE.MathUtils.lerp(
                  mesh.morphTargetInfluences![idx],
                  targetVal,
                  lerpRate
                );
              }
            };

            setMorph('eyeBlinkLeft', blinkTarget, 0.35);
            setMorph('eyeBlinkRight', blinkTarget, 0.35);
            setMorph('mouthSmile', targetSmile, 0.1);
            setMorph('mouthSmileLeft', targetSmile, 0.1);
            setMorph('mouthSmileRight', targetSmile, 0.1);
            setMorph('cheekSquintLeft', targetCheek, 0.1);
            setMorph('cheekSquintRight', targetCheek, 0.1);
            setMorph('browDownLeft', targetBrowDown, 0.12);
            setMorph('browDownRight', targetBrowDown, 0.12);
            setMorph('browInnerUp', targetBrowUp, 0.12);
            setMorph('mouthOpen', targetMouthOpen, 0.15);
            setMorph('jawOpen', targetMouthOpen * 0.7, 0.15);
          }
        }

        // Default natural relaxed posture (arms hanging comfortably, elbows softly bent)
        let rArm = { x: 0.05, y: 0, z: -breathe * 0.4 };
        let rFore = { x: 0.05, y: 0, z: -0.05 };
        let rHand = { x: 0, y: 0, z: 0 };
        let rHandPose: HandPose = POSE_RELAXED;

        let lArm = { x: 0.05, y: 0, z: breathe * 0.4 };
        let lFore = { x: 0.05, y: 0, z: 0.05 };
        let lHand = { x: 0, y: 0, z: 0 };
        let lHandPose: HandPose = POSE_RELAXED;

        let head = { x: breathe * 0.4, y: 0, z: 0 };
        let spineBow = 0;
        let spineTwist = 0;

        if (!curPlaying) {
          // Paused / Ready state: avatar breathes gently in natural posture
        } else if (glossUpper.includes('NAMASTE') || glossUpper.includes('HELLO') || glossUpper.includes('GREET') || glossUpper.includes('NAMASKAR') || glossUpper.includes('HI')) {
          // Namaste / Anjali Mudra: Both hands pressed together flat at heart center, respectful gentle bow
          const bow = Math.sin(progress * Math.PI) * 0.16;
          lArm = { x: 0.52, y: 0.05, z: 0.68 };
          lFore = { x: 0.22, y: 0, z: 1.12 };
          lHand = { x: 0.12, y: 0, z: -0.22 };
          lHandPose = POSE_OPEN_PALM;

          rArm = { x: 0.52, y: -0.05, z: -0.68 };
          rFore = { x: 0.22, y: 0, z: -1.12 };
          rHand = { x: 0.12, y: 0, z: 0.22 };
          rHandPose = POSE_OPEN_PALM;

          head = { x: 0.14 + bow, y: 0, z: 0 };
          spineBow = bow * 0.5;
        } else if (glossUpper.includes('THANK') || glossUpper.includes('GRATITUDE') || glossUpper.includes('DHANYAWAD') || glossUpper.includes('SHUKRIYA')) {
          // Thank you: Flat hand touches chin and fluidly sweeps forward & down toward interlocutor
          const sweep = THREE.MathUtils.smoothstep(progress, 0.22, 0.75);
          rArm = {
            x: THREE.MathUtils.lerp(0.58, 0.28, sweep),
            y: 0,
            z: THREE.MathUtils.lerp(-1.08, -0.72, sweep),
          };
          rFore = {
            x: THREE.MathUtils.lerp(0.32, 0.08, sweep),
            y: 0,
            z: THREE.MathUtils.lerp(-1.38, -0.62, sweep),
          };
          rHand = {
            x: THREE.MathUtils.lerp(0.12, -0.22, sweep),
            y: 0,
            z: THREE.MathUtils.lerp(0.05, -0.15, sweep),
          };
          rHandPose = POSE_OPEN_PALM;
          head = { x: 0.08, y: 0, z: 0 };
        } else if (glossUpper.includes('YES') || glossUpper.includes('AGREE') || glossUpper.includes('HAAN') || glossUpper.includes('CORRECT')) {
          // Yes: Right fist at chest with 2 clear rhythmic nodding pulses and head affirmation
          const nodPulse = (progress > 0.15 && progress < 0.85)
            ? Math.sin(((progress - 0.15) / 0.7) * Math.PI * 4) * 0.32
            : 0;
          rArm = { x: 0.42, y: 0, z: -0.65 };
          rFore = { x: 0.12, y: 0, z: -0.98 };
          rHand = { x: nodPulse, y: 0, z: 0 };
          rHandPose = POSE_FIST;
          head = { x: 0.08 + nodPulse * 0.45, y: 0, z: 0 };
        } else if (glossUpper.includes('NO') || glossUpper.includes('NOT') || glossUpper.includes('NAHI') || glossUpper.includes('DISAGREE') || glossUpper.includes('CANCEL')) {
          // No: Right hand side waggle with decisive head shake
          const shake = (progress > 0.15 && progress < 0.85)
            ? Math.sin(((progress - 0.15) / 0.7) * Math.PI * 4) * 0.42
            : 0;
          rArm = { x: 0.32, y: 0, z: -0.78 };
          rFore = { x: 0.12, y: 0, z: -0.88 };
          rHand = { x: 0, y: shake * 0.6, z: shake * 0.4 };
          rHandPose = POSE_OPEN_PALM;
          head = { x: 0, y: shake * 0.55, z: 0 };
        } else if (glossUpper.includes('PLATFORM') || glossUpper.includes('TRAIN') || glossUpper.includes('RAILWAY') || glossUpper.includes('METRO') || glossUpper.includes('TRACK')) {
          // Platform / Train: Left forearm horizontal track surface; right hand glides along track
          lArm = { x: 0.48, y: 0, z: 0.62 };
          lFore = { x: 0.28, y: 0, z: 0.98 };
          lHand = { x: 0.08, y: 0, z: 0 };
          lHandPose = POSE_OPEN_PALM;

          const glide = THREE.MathUtils.smoothstep(progress, 0.2, 0.8) * 0.35 - 0.15;
          rArm = { x: 0.48 + glide, y: 0, z: -0.68 };
          rFore = { x: 0.22, y: 0, z: -0.92 };
          rHand = { x: 0.08, y: 0, z: 0 };
          rHandPose = POSE_TWO_FINGERS;
        } else if (glossUpper === '3' || glossUpper.includes('THREE') || glossUpper.includes(' 3') || glossUpper.includes('3RD')) {
          // Number 3: Indian Sign Language 3 (Index, Middle, Ring straight up & spread, thumb over pinky)
          rArm = { x: 0.32, y: 0, z: -0.88 };
          rFore = { x: 0.18, y: 0, z: -1.08 };
          rHand = { x: -0.18, y: 0, z: 0 };
          rHandPose = POSE_THREE_FINGERS;
          head = { x: 0.05, y: 0, z: 0 };
        } else if (glossUpper.includes('STRAIGHT') || glossUpper.includes('GO') || glossUpper.includes('FORWARD') || glossUpper.includes('AHEAD') || glossUpper.includes('DIRECTION') || glossUpper.includes('RIGHT') || glossUpper.includes('LEFT')) {
          // Straight / Direction: Clean index point forward with purposeful guidance
          const pointPulse = Math.sin(progress * Math.PI * 3) * 0.08;
          rArm = { x: 0.22, y: 0, z: -0.88 - pointPulse };
          rFore = { x: 0.06, y: 0, z: -0.52 };
          rHand = { x: -0.12, y: 0, z: 0 };
          rHandPose = POSE_POINT_INDEX;
          head = { x: 0.04, y: -0.06, z: 0 };
        } else if (glossUpper.includes('DOCTOR') || glossUpper.includes('MEDIC') || glossUpper.includes('HOSPITAL') || glossUpper.includes('CLINIC')) {
          // Doctor: Left arm palm up; right two fingers tapping radial pulse twice
          lArm = { x: 0.42, y: 0, z: 0.52 };
          lFore = { x: 0.28, y: 0, z: 0.92 };
          lHand = { x: 0.12, y: 0.2, z: 0.1 };
          lHandPose = POSE_OPEN_PALM;

          const tap1 = Math.max(0, 1 - Math.abs(progress - 0.36) * 10);
          const tap2 = Math.max(0, 1 - Math.abs(progress - 0.64) * 10);
          const tap = (tap1 + tap2) * 0.16;
          rArm = { x: 0.52, y: 0, z: -0.66 };
          rFore = { x: 0.22 + tap, y: 0, z: -1.04 };
          rHand = { x: 0.18, y: 0, z: 0 };
          rHandPose = POSE_TWO_FINGERS;
          head = { x: 0.12, y: -0.04, z: 0 };
        } else if (glossUpper.includes('HELP') || glossUpper.includes('ASSIST') || glossUpper.includes('SAHAYATA')) {
          // Help: Left palm supports right thumbs-up fist, lifting together in unison
          const lift = THREE.MathUtils.smoothstep(progress, 0.22, 0.72) * 0.18;
          lArm = { x: 0.44, y: 0, z: 0.58 + lift };
          lFore = { x: 0.22, y: 0, z: 0.92 };
          lHand = { x: 0.1, y: 0, z: 0 };
          lHandPose = POSE_OPEN_PALM;

          rArm = { x: 0.44, y: 0, z: -0.58 - lift };
          rFore = { x: 0.22, y: 0, z: -0.92 };
          rHand = { x: 0.1, y: 0, z: 0 };
          rHandPose = POSE_THUMBS_UP;
          spineBow = -lift * 0.3;
        } else if (glossUpper.includes('WATER') || glossUpper.includes('DRINK') || glossUpper.includes('PAANI')) {
          // Water: W-handshape gently tapping corner of lip twice with slight sipping tilt
          const sip1 = Math.max(0, 1 - Math.abs(progress - 0.35) * 9);
          const sip2 = Math.max(0, 1 - Math.abs(progress - 0.62) * 9);
          const sip = (sip1 + sip2) * 0.12;
          rArm = { x: 0.52, y: 0, z: -1.08 };
          rFore = { x: 0.32 + sip, y: 0, z: -1.32 };
          rHand = { x: 0.28, y: 0, z: 0 };
          rHandPose = POSE_THREE_FINGERS;
          head = { x: -0.08 - sip * 0.5, y: 0.05, z: 0 };
        } else if (glossUpper.includes('TIME') || glossUpper.includes('SAMAY') || glossUpper.includes('WATCH') || glossUpper.includes('HOUR') || glossUpper.includes('DELAY') || glossUpper.includes('LATE') || glossUpper.includes('SCHEDULE')) {
          // Time: Left arm horizontal showing wristwatch; right index finger tapping watch face twice
          lArm = { x: 0.42, y: 0, z: 0.52 };
          lFore = { x: 0.28, y: 0, z: 0.92 };
          lHand = { x: 0.12, y: 0, z: 0 };
          lHandPose = POSE_OPEN_PALM;

          const tap1 = Math.max(0, 1 - Math.abs(progress - 0.35) * 10);
          const tap2 = Math.max(0, 1 - Math.abs(progress - 0.62) * 10);
          const tap = (tap1 + tap2) * 0.16;
          rArm = { x: 0.52, y: 0, z: -0.72 };
          rFore = { x: 0.22 + tap, y: 0, z: -1.02 };
          rHand = { x: 0.12, y: 0, z: 0 };
          rHandPose = POSE_POINT_INDEX;
          head = { x: 0.14, y: 0, z: 0 };
        } else if (glossUpper.includes('WELCOME') || glossUpper.includes('INVITE') || glossUpper.includes('AAYIYE') || glossUpper.includes('SWAGAT') || glossUpper.includes('COME')) {
          // Welcome: Both arms open wide with palms up, sweeping inward in cordial invitation
          const sweep = Math.sin(progress * Math.PI) * 0.16;
          rArm = { x: 0.28 - sweep, y: 0, z: -0.72 };
          rFore = { x: 0.12, y: 0, z: -0.62 };
          rHand = { x: -0.22, y: 0, z: 0 };
          rHandPose = POSE_OPEN_PALM;

          lArm = { x: 0.28 - sweep, y: 0, z: 0.72 };
          lFore = { x: 0.12, y: 0, z: 0.62 };
          lHand = { x: -0.22, y: 0, z: 0 };
          lHandPose = POSE_OPEN_PALM;

          head = { x: 0.08, y: 0, z: 0 };
        } else if (glossUpper.includes('WHERE') || glossUpper.includes('WHAT') || glossUpper.includes('WHY') || glossUpper.includes('KAHAN') || glossUpper.includes('KYA') || glossUpper.includes('QUESTION') || glossUpper.includes('HOW')) {
          // Where / Question: Both hands held forward at waist height, palms up with shrugging posture
          const shrug = Math.sin(progress * Math.PI) * 0.1;
          rArm = { x: 0.22, y: 0, z: -0.62 - shrug };
          rFore = { x: 0.12, y: 0, z: -0.72 };
          rHandPose = POSE_OPEN_PALM;

          lArm = { x: 0.22, y: 0, z: 0.62 + shrug };
          lFore = { x: 0.12, y: 0, z: 0.72 };
          lHandPose = POSE_OPEN_PALM;

          head = { x: -0.04, y: 0.06, z: 0.06 };
        } else if (glossUpper.includes('PLEASE') || glossUpper.includes('KRIPYA') || glossUpper.includes('REQUEST')) {
          // Please: Open right palm rubbing in gentle circles over center chest
          const circleAngle = (progress > 0.15 && progress < 0.85)
            ? ((progress - 0.15) / 0.7) * Math.PI * 4
            : 0;
          const cx = Math.cos(circleAngle) * 0.08;
          const cy = Math.sin(circleAngle) * 0.08;
          rArm = { x: 0.52 + cx, y: 0, z: -0.72 + cy };
          rFore = { x: 0.22, y: 0, z: -1.02 };
          rHand = { x: 0.05, y: 0, z: 0 };
          rHandPose = POSE_OPEN_PALM;
          head = { x: 0.08, y: 0, z: 0 };
        } else if (glossUpper.includes('UNDERSTOOD') || glossUpper.includes('OK') || glossUpper.includes('GOOD') || glossUpper.includes('FINE') || glossUpper.includes('THEEK') || glossUpper.includes('BADIYA') || glossUpper.includes('GREAT')) {
          // Understood / OK: Clean OK mudra (index & thumb touching) pulsing forward with head nod
          const okPulse = Math.sin(progress * Math.PI) * 0.14;
          rArm = { x: 0.38, y: 0, z: -0.75 - okPulse };
          rFore = { x: 0.18, y: 0, z: -0.92 };
          rHand = { x: -0.15, y: 0, z: 0 };
          rHandPose = POSE_OK;
          head = { x: 0.1 + okPulse * 0.6, y: 0, z: 0 };
        } else if (glossUpper.includes('WRITE') || glossUpper.includes('PEN') || glossUpper.includes('NOTE')) {
          // Write down: Left flat palm notepad; right hand scribbling across with imaginary pen
          lArm = { x: 0.46, y: 0, z: 0.52 };
          lFore = { x: 0.32, y: 0, z: 0.98 };
          lHandPose = POSE_OPEN_PALM;

          const scribble = (progress > 0.2 && progress < 0.8)
            ? Math.sin(((progress - 0.2) / 0.6) * Math.PI * 6) * 0.12
            : 0;
          rArm = { x: 0.52, y: 0, z: -0.66 };
          rFore = { x: 0.26 + scribble, y: 0, z: -1.02 };
          rHand = { x: 0.08, y: 0, z: 0 };
          rHandPose = POSE_PINCH_PEN;
          head = { x: 0.12, y: 0, z: 0 };
        } else if (glossUpper.includes('REPEAT') || glossUpper.includes('AGAIN') || glossUpper.includes('PHIR')) {
          // Repeat: Right hand making a clean looping arc into left open palm
          lArm = { x: 0.42, y: 0, z: 0.52 };
          lFore = { x: 0.22, y: 0, z: 0.92 };
          lHandPose = POSE_OPEN_PALM;

          const loop = (progress > 0.2 && progress < 0.8)
            ? Math.sin(((progress - 0.2) / 0.6) * Math.PI * 2) * 0.18
            : 0;
          rArm = { x: 0.42 + loop, y: 0, z: -0.72 };
          rFore = { x: 0.22, y: 0, z: -1.02 };
          rHandPose = POSE_OPEN_PALM;
        } else if (glossUpper.includes('I-LOVE-YOU') || glossUpper.includes('LOVE') || glossUpper.includes('PYAR')) {
          // I Love You: Thumb, index, and pinky extended pushing forward affectionately
          const push = THREE.MathUtils.smoothstep(progress, 0.2, 0.7) * 0.12;
          rArm = { x: 0.32, y: 0, z: -0.88 - push };
          rFore = { x: 0.12, y: 0, z: -0.98 };
          rHand = { x: -0.22, y: 0, z: 0 };
          rHandPose = POSE_ILY;
        } else if (glossUpper.includes('EMERGENCY') || glossUpper.includes('DANGER') || glossUpper.includes('KHATRA') || glossUpper.includes('ALERT')) {
          // Emergency: Both arms raised flashing forward with urgent alert posture
          const alertPulse = Math.sin(progress * Math.PI * 4) * 0.14;
          rArm = { x: 0.32, y: 0, z: -0.92 - alertPulse };
          rFore = { x: 0.12, y: 0, z: -0.82 };
          rHandPose = POSE_OPEN_PALM;

          lArm = { x: 0.32, y: 0, z: 0.92 + alertPulse };
          lFore = { x: 0.12, y: 0, z: 0.82 };
          lHandPose = POSE_OPEN_PALM;
        } else if (curPlaying && curGloss !== 'READY') {
          // General conversational Indian Sign Language cadence (fluent bimanual phrasing)
          const cadence = Math.sin(elapsedTime * 3.5) * 0.18;
          const rhythm = Math.cos(elapsedTime * 3.5) * 0.15;

          rArm = { x: 0.35 + cadence, y: 0, z: -0.65 + rhythm };
          rFore = { x: 0.15, y: 0, z: -0.85 - cadence };
          rHandPose = POSE_RELAXED;

          lArm = { x: 0.25 - cadence * 0.5, y: 0, z: 0.55 - rhythm * 0.5 };
          lFore = { x: 0.1, y: 0, z: 0.75 };
          lHandPose = POSE_RELAXED;

          head = { x: 0.05 + cadence * 0.2, y: rhythm * 0.3, z: 0 };
        }

        // Natural scapular / shoulder elevation following arm movement
        const rElev = Math.max(0, -rArm.z);
        const lElev = Math.max(0, lArm.z);

        let rShoulder = { x: 0, y: -rElev * 0.14, z: -rElev * 0.1 };
        let lShoulder = { x: 0, y: lElev * 0.14, z: lElev * 0.1 };

        if (isQuestion) {
          rShoulder.y -= 0.16;
          lShoulder.y += 0.16;
        }

        applyDeltaEuler(rig.rightShoulder, rShoulder.x, rShoulder.y, rShoulder.z, 0.12);
        applyDeltaEuler(rig.leftShoulder, lShoulder.x, lShoulder.y, lShoulder.z, 0.12);

        // Apply Bone Transformations
        applyDeltaEuler(rig.rightArm, rArm.x, rArm.y, rArm.z, 0.11);
        applyDeltaEuler(rig.rightForeArm, rFore.x, rFore.y, rFore.z, 0.11);
        applyDeltaEuler(rig.rightHand, rHand.x, rHand.y, rHand.z, 0.14);

        applyDeltaEuler(rig.leftArm, lArm.x, lArm.y, lArm.z, 0.11);
        applyDeltaEuler(rig.leftForeArm, lFore.x, lFore.y, lFore.z, 0.11);
        applyDeltaEuler(rig.leftHand, lHand.x, lHand.y, lHand.z, 0.14);

        applyDeltaEuler(rig.spine, spineBow + breathe * 0.4, spineTwist, microSway, 0.08);
        applyDeltaEuler(rig.neck, head.x * 0.35 + breathe * 0.15, head.y * 0.35, head.z * 0.35, 0.1);
        applyDeltaEuler(rig.head, head.x, head.y, head.z, 0.12);

        // Apply Anatomical Cascading Finger Flexion to Both Hands
        applyHandPose('right', rHandPose, 0.16);
        applyHandPose('left', lHandPose, 0.16);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col transition-colors">
      
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
        
        {/* Title & Real 3D GLTF Avatar Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Avatar
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Photorealistic 3D
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Kinematic skeletal Indian Sign Language (ISL) gestures & 360° orbit
            </p>
          </div>
        </div>

        {/* Camera Views & Reset */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCameraView('chest')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
              cameraView === 'chest'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Upper Body
          </button>
          <button
            onClick={() => setCameraView('face')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
              cameraView === 'face'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Close-up
          </button>
          <button
            onClick={handleResetControls}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Reset 360° Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Main 3D Canvas Viewport */}
      <div className={`relative w-full ${height} overflow-hidden cursor-grab active:cursor-grabbing bg-radial from-slate-100/50 to-slate-200/50 dark:from-slate-900 dark:to-slate-950`}>
        
        {/* Loading Spinner */}
        {isLoadingModel && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-xs text-white">
            <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-bold tracking-wide">Loading 3D Avatar... {loadingProgress}%</span>
            <span className="text-[10px] text-slate-300 mt-1">Calibrating kinematic ISL skeletal rig</span>
          </div>
        )}

        {/* 3D WebGL Canvas Container */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Floating Gloss & Meaning HUD */}
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex items-start justify-between">
          
          {/* Active Token Pill */}
          <div className="bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-lg text-white max-w-[70%]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-sky-400">
                Current ISL Sign
              </span>
              {isPlaying && signTokens.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <div className="text-sm sm:text-base font-black tracking-wide text-white truncate">
              {displayGloss}
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              {displayMeaning}
            </p>
          </div>

          {/* Orbit Instruction Tag */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-[10px] text-slate-300 shadow-sm">
            <Compass className="w-3 h-3 text-sky-400" />
            <span>Drag to Orbit 360°</span>
          </div>
        </div>

        {/* Active Sentence Token Flow Pills (if sentence or dialogue tokens present) */}
        {signTokens.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 pointer-events-auto">
            {signTokens.map((token, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveTokenIndex(idx);
                  setIsPlaying(true);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap ${
                  idx === activeTokenIndex
                    ? 'bg-sky-500 text-white ring-2 ring-sky-300 dark:ring-sky-600 scale-105'
                    : idx < activeTokenIndex
                    ? 'bg-slate-900/70 text-slate-300 border border-slate-700/60 hover:bg-slate-800'
                    : 'bg-slate-900/50 text-slate-400 border border-slate-800/60 hover:bg-slate-800'
                }`}
              >
                {token.gloss}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Interactive Bottom Control Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/30 flex flex-col gap-3">
        
        {/* Playback Controls & Speed */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Signing'}</span>
            </button>

            <button
              onClick={() => {
                setActiveTokenIndex(0);
                setIsPlaying(true);
              }}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Replay from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Speed:</span>
            {[0.5, 1, 1.5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  speed === s
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

        </div>

        {/* Quick ISL Gesture Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Quick Signs:
          </span>
          {QUICK_GESTURE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                tokenStartTimeRef.current = performance.now();
                setActivePresetTokens(preset.tokens);
                setActiveTokenIndex(0);
                setIsPlaying(true);
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 whitespace-nowrap transition cursor-pointer shadow-2xs active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};
