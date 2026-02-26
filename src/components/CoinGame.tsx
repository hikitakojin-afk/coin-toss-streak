"use client"

import { useRef, useEffect, Suspense, useMemo, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, useTexture, Text } from "@react-three/drei"
import { Physics, CuboidCollider, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import * as THREE from "three"

export type CoinSide = "heads" | "tails"

export interface CoinGameProps {
    onStreakUpdate: (streak: number, side: CoinSide | null) => void
    streak: number
    targetSide: CoinSide | null
    onTossStarted: () => void
}

// Global Volume Control
export let masterVolume = 0.5
export const setMasterVolume = (v: number) => {
    masterVolume = Math.max(0, Math.min(1, v))
}

let globalAudioCtx: AudioContext | null = null
let bgmAudioEl: HTMLAudioElement | null = null
let bgmTrack: MediaElementAudioSourceNode | null = null
let bgmGain: GainNode | null = null

const initAudio = () => {
    if (!globalAudioCtx && typeof window !== "undefined") {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        globalAudioCtx = new AudioContextClass()
    }
}

export const resumeAudioContext = () => {
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume()
    }
}

// BGM using HTMLAudioElement with Web Audio API for volume control
export const playAmbientBGM = () => {
    initAudio()
    if (!globalAudioCtx || masterVolume <= 0) return

    if (!bgmAudioEl) {
        bgmAudioEl = new Audio("/bgm2.mp3")
        bgmAudioEl.loop = true
        bgmAudioEl.crossOrigin = "anonymous"

        bgmTrack = globalAudioCtx.createMediaElementSource(bgmAudioEl)

        bgmGain = globalAudioCtx.createGain()
        bgmGain.gain.setValueAtTime(0, globalAudioCtx.currentTime)

        bgmTrack.connect(bgmGain)
        bgmGain.connect(globalAudioCtx.destination)
    }

    if (bgmAudioEl.paused) {
        bgmGain!.gain.setValueAtTime(0, globalAudioCtx.currentTime)
        bgmGain!.gain.linearRampToValueAtTime(0.04 * masterVolume, globalAudioCtx.currentTime + 3.0) // 3s fade in
        bgmAudioEl.play().catch(e => console.error("BGM Autoplay prevented", e))
    }
}

export const updateBGMVolume = (v: number) => {
    if (bgmGain && globalAudioCtx) {
        bgmGain.gain.linearRampToValueAtTime(0.04 * v, globalAudioCtx.currentTime + 0.1)
    }
}

// Improved higher-pitched metallic sound
const playMetallicSound = (baseFreq: number, duration: number, isWin: boolean = false, isHeavy: boolean = false) => {
    if (!globalAudioCtx || masterVolume <= 0) return
    const ctx = globalAudioCtx
    const t = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const osc3 = ctx.createOscillator()

    const gainNode = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc1.type = isHeavy ? "square" : "sine"
    osc2.type = "sine"
    osc3.type = "triangle"

    const highPitchMult = 1.5;

    osc1.frequency.setValueAtTime(baseFreq * highPitchMult, t)
    osc2.frequency.setValueAtTime(baseFreq * 2.76 * highPitchMult, t)
    osc3.frequency.setValueAtTime(baseFreq * 5.4 * highPitchMult, t)

    const peakVolume = (isWin ? 0.3 : (isHeavy ? 0.5 : 0.4)) * masterVolume

    gainNode.gain.setValueAtTime(0, t)
    gainNode.gain.linearRampToValueAtTime(peakVolume, t + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration)

    filter.type = "bandpass"
    filter.frequency.setValueAtTime(baseFreq * 2 * highPitchMult, t)
    if (isWin) {
        filter.frequency.linearRampToValueAtTime(baseFreq * 4 * highPitchMult, t + 0.5)
    } else {
        filter.frequency.linearRampToValueAtTime(baseFreq * 0.5 * highPitchMult, t + 0.5)
    }
    filter.Q.value = 8

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    osc3.connect(gainNode)
    gainNode.connect(filter)
    filter.connect(ctx.destination)

    osc1.start(t)
    osc2.start(t)
    osc3.start(t)
    osc1.stop(t + duration)
    osc2.stop(t + duration)
    osc3.stop(t + duration)
}

let activeHeartbeatOsc: OscillatorNode | null = null;
let activeHeartbeatGain: GainNode | null = null;

const playHeartbeatSound = () => {
    if (!globalAudioCtx || masterVolume <= 0) return
    const ctx = globalAudioCtx
    const t = ctx.currentTime

    // Cleanup previous if any
    stopHeartbeatSound()

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = "sine"
    osc.frequency.setValueAtTime(40, t) // Deep sub-bass

    // Create a pulsing heartbeat LFO effect using gain automation
    // A heartbeat is typically two quick thumps followed by a pause.
    // We'll simulate a continuous heavy thump loop by automating the gain.
    gainNode.gain.setValueAtTime(0, t)

    // Pulse 1
    gainNode.gain.linearRampToValueAtTime(0.8 * masterVolume, t + 0.1)
    gainNode.gain.exponentialRampToValueAtTime(0.1 * masterVolume, t + 0.3)
    // Pulse 2
    gainNode.gain.linearRampToValueAtTime(0.6 * masterVolume, t + 0.4)
    gainNode.gain.exponentialRampToValueAtTime(0.01 * masterVolume, t + 0.8)

    // Keep looping this envelope by recreating it or just letting it be a long low rumble
    // For simplicity, we'll just do a 1-second looping pulse by connecting an LFO to gain
    const lfo = ctx.createOscillator()
    lfo.type = "sine"
    lfo.frequency.setValueAtTime(1.5, t) // 1.5 beats per second

    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(0.5 * masterVolume, t) // Depth of pulse

    lfo.connect(lfoGain)
    // We can't easily connect LFO directly to AudioParam in all browsers for complex envelopes,
    // so we'll just use a lowpass filter to muffle it and give it that "underwater" heartbeat feel.

    filter.type = "lowpass"
    filter.frequency.setValueAtTime(150, t)

    osc.connect(gainNode)
    gainNode.connect(filter)
    filter.connect(ctx.destination)

    osc.start(t)

    activeHeartbeatOsc = osc;
    activeHeartbeatGain = gainNode;
}

const stopHeartbeatSound = () => {
    if (activeHeartbeatOsc && activeHeartbeatGain && globalAudioCtx) {
        const t = globalAudioCtx.currentTime;
        activeHeartbeatGain.gain.cancelScheduledValues(t);
        activeHeartbeatGain.gain.linearRampToValueAtTime(0, t + 0.5); // Fade out over 0.5s
        activeHeartbeatOsc.stop(t + 0.6);
        activeHeartbeatOsc = null;
        activeHeartbeatGain = null;
    }
}

function CameraFollowController({ isFlipping, coinRef }: { isFlipping: React.MutableRefObject<boolean>, coinRef: React.RefObject<RapierRigidBody> }) {
    const { camera } = useThree()
    const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))
    const targetPos = useRef(new THREE.Vector3(0, 8, 12))

    useFrame((state, delta) => {
        if (!coinRef.current) return

        const pos = coinRef.current.translation()

        const desiredLook = new THREE.Vector3(pos.x, Math.max(0, pos.y), pos.z)
        targetLookAt.current.lerp(desiredLook, delta * 5)

        const heightOffset = isFlipping.current ? 7 + Math.max(0, pos.y * 0.3) : 8;
        const zOffset = isFlipping.current ? 10 + Math.max(0, pos.z * 0.5) : 12;
        const desiredPos = new THREE.Vector3(pos.x * 0.5, heightOffset, pos.z + zOffset)

        targetPos.current.lerp(desiredPos, delta * 4)

        state.camera.position.copy(targetPos.current)
        state.camera.lookAt(targetLookAt.current)
    })
    return null
}

function PhysicsStepper({ timeScale }: { timeScale: number }) {
    const { step } = useRapier()
    useFrame((state, delta) => {
        // Step physics manually based on timeScale. Limit max delta to prevent death-spirals on lag.
        step(Math.min(delta, 0.1) * timeScale)
    })
    return null
}

function CoinMesh({
    initialPosition,
    onLanded,
    isFlipping,
    coinRef,
    onTossStarted,
    targetSide,
    projectedStreak,
    setTimeScale
}: {
    initialPosition: [number, number, number],
    onLanded: (side: CoinSide) => void,
    isFlipping: React.MutableRefObject<boolean>,
    coinRef: React.MutableRefObject<RapierRigidBody | null>,
    onTossStarted: () => void,
    targetSide: CoinSide | null,
    projectedStreak: number,
    setTimeScale: (scale: number) => void
}) {
    const localFlipping = useRef(false)
    const hasReportedLanded = useRef(false)
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null)
    const pointerDownPos = useRef({ x: 0, y: 0 })
    const pointerDownTime = useRef(0)

    const [headsTexture, tailsTexture] = useTexture([
        "/textures/heads.png",
        "/textures/tails.png"
    ])

    // Ultra high glossy, emissive gold material for spotlight reflection
    const matProps = useMemo(() => ({
        color: "#ffffff",
        metalness: 1.0,
        roughness: 0.05,
        emissive: "#ddb300",
        emissiveIntensity: 1.0,
        toneMapped: false
    }), [])

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
        }
    }, [])

    const forceLandProcess = (rigidBody: RapierRigidBody) => {
        hasReportedLanded.current = true
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)

        const rotation = rigidBody.rotation()
        const matrix = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))
        const upVector = new THREE.Vector3(0, 1, 0).applyMatrix4(matrix)
        const result: CoinSide = upVector.y > 0 ? "heads" : "tails"

        // Trigger result and stop slowmo immediately when coin physics sleep
        stopHeartbeatSound()
        setTimeScale(1.0)
        onLanded(result)

        // Wait a moment before teleporting the coin back to the start position so it doesn't vanish instantly
        setTimeout(() => {
            if (coinRef.current) {
                localFlipping.current = false
                hasReportedLanded.current = false
                isFlipping.current = false

                coinRef.current.setTranslation({ x: initialPosition[0], y: 0.5, z: initialPosition[2] }, true)
                coinRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
                coinRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
            }
        }, 1200)
    }

    useFrame(() => {
        if (localFlipping.current && coinRef.current && !hasReportedLanded.current) {
            const velocity = coinRef.current.linvel()
            const angVel = coinRef.current.angvel()
            const isPhysicsSleeping = (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1 && Math.abs(velocity.z) < 0.1) &&
                (Math.abs(angVel.x) < 0.1 && Math.abs(angVel.y) < 0.1 && Math.abs(angVel.z) < 0.1);

            if (isPhysicsSleeping) {
                forceLandProcess(coinRef.current)
            }
        }
    })

    return (
        <RigidBody
            ref={coinRef}
            colliders="hull"
            restitution={0.6}
            friction={0.8}
            position={initialPosition}
            linearDamping={0.4}
            angularDamping={0.6}
            ccd={true}
            onCollisionEnter={(payload) => {
                if (payload.other.rigidBodyObject?.name === "floor" && localFlipping.current && !hasReportedLanded.current) {
                    playMetallicSound(1200, 0.2, false, true)

                    // Slow-Mo multiple of 5 trigger on first bounce
                    if (projectedStreak > 0 && projectedStreak % 5 === 0) {
                        setTimeScale(0.6) // Set simulation visually slower (0.6x)
                        playHeartbeatSound()
                    }
                }
            }}
        >
            <group scale={0.5}>
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
                    <meshStandardMaterial attach="material-0" {...matProps} />
                    <meshStandardMaterial attach="material-1" map={headsTexture} {...matProps} emissiveMap={headsTexture} />
                    <meshStandardMaterial attach="material-2" map={tailsTexture} {...matProps} emissiveMap={tailsTexture} />
                </mesh>
                <mesh
                    visible={false}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.target as any).setPointerCapture(e.pointerId);
                        if (isFlipping.current) return;
                        pointerDownPos.current = { x: e.clientX, y: e.clientY }
                        pointerDownTime.current = performance.now()
                    }}
                    onPointerUp={(e) => {
                        e.stopPropagation();
                        (e.target as any).releasePointerCapture(e.pointerId);
                        if (isFlipping.current) return;

                        const deltaX = e.clientX - pointerDownPos.current.x
                        const deltaY = e.clientY - pointerDownPos.current.y
                        const deltaTime = Math.max(16, performance.now() - pointerDownTime.current)

                        const isFlick = deltaY < -20 && deltaTime < 600
                        const isTap = Math.abs(deltaY) < 10 && Math.abs(deltaX) < 10 && deltaTime < 300

                        if (isFlick || isTap) {
                            initAudio()
                            playAmbientBGM()
                            resumeAudioContext()
                            playMetallicSound(1400, 0.5)

                            onTossStarted()
                            isFlipping.current = true
                            localFlipping.current = true
                            hasReportedLanded.current = false

                            if (safetyTimerRef.current) {
                                clearTimeout(safetyTimerRef.current)
                            }
                            safetyTimerRef.current = setTimeout(() => {
                                if (localFlipping.current && coinRef.current && !hasReportedLanded.current) {
                                    forceLandProcess(coinRef.current)
                                }
                            }, 4000)

                            // Pure 50/50 Random Physics outcome
                            const isWinOutcome = Math.random() < 0.5
                            const forcedTarget = targetSide || "heads"
                            const outcomeSide = isWinOutcome ? forcedTarget : (forcedTarget === "heads" ? "tails" : "heads")

                            if (coinRef.current) {
                                const rawVelX = (deltaX / deltaTime) * 15
                                const rawVelZ = (deltaY / deltaTime) * 15
                                const velY = isTap ? 20 : Math.min((Math.abs(deltaY) / deltaTime) * 20 + 10, 40)

                                const clampedVelX = Math.max(-15, Math.min(15, rawVelX))
                                const clampedVelZ = Math.max(-25, Math.min(10, rawVelZ))

                                let torqueX = velY * 1.5 // Massively increased torque for heavy rotation on weak throws
                                let torqueZ = 0
                                const isHeads = outcomeSide === "heads"

                                // Guarantee landing face using rotation lock constraint hack
                                coinRef.current.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(isHeads ? 0 : Math.PI, 0, 0)), true)

                                coinRef.current.setTranslation({ x: initialPosition[0], y: initialPosition[1], z: initialPosition[2] }, true)
                                coinRef.current.setLinvel({ x: clampedVelX, y: velY, z: clampedVelZ }, true)
                                coinRef.current.setAngvel({ x: torqueX, y: Math.random() * 2, z: torqueZ }, true)
                            }
                        }
                    }}
                >
                    <cylinderGeometry args={[2.5, 2.5, 1, 16]} />
                </mesh>
            </group>
        </RigidBody>
    )
}

function WoodTable() {
    const tableTexture = useTexture("/desk_wood.png")
    tableTexture.wrapS = THREE.RepeatWrapping
    tableTexture.wrapT = THREE.RepeatWrapping
    tableTexture.repeat.set(2, 2)
    tableTexture.colorSpace = THREE.SRGBColorSpace

    return (
        <RigidBody type="fixed" name="floor" restitution={0.3} friction={1}>
            <CuboidCollider args={[50, 0.5, 50]} position={[0, -0.5, 0]} />
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial map={tableTexture} roughness={0.6} metalness={0.1} />
            </mesh>
        </RigidBody>
    )
}

function AdBoard({ position, rotation, width, height, label }: { position: [number, number, number], rotation: [number, number, number], width: number, height: number, label: string }) {
    return (
        <RigidBody type="fixed" position={position} rotation={rotation} restitution={0.2} friction={0.5}>
            {/* The physical board */}
            <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
                <boxGeometry args={[width, height, 0.2]} />
                <meshStandardMaterial color="#1f1f1f" roughness={0.9} metalness={0.1} />
            </mesh>
            {/* The Text Label */}
            <Text
                position={[0, height / 2, 0.11]}
                fontSize={height * 0.3}
                color="#fcd34d"
                anchorX="center"
                anchorY="middle"
                maxWidth={width * 0.9}
                textAlign="center"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
                {label}
            </Text>
        </RigidBody>
    )
}

export function CoinGame({ onStreakUpdate, streak, targetSide, onTossStarted }: CoinGameProps) {
    const isFlipping = useRef(false)
    const coinRef = useRef<RapierRigidBody>(null)
    const [timeScale, setTimeScale] = useState<number>(1.0)

    const projectedStreak = streak === 0 ? 1 : streak + 1;

    const handleLanded = (result: CoinSide) => {
        setTimeout(() => {
            let isWin = false
            let effectiveTarget = targetSide

            if (streak === 0) {
                isWin = true
                effectiveTarget = result
            } else {
                isWin = (result === targetSide)
            }

            if (isWin) {
                playMetallicSound(880, 1.5, true)
                setTimeout(() => playMetallicSound(1108.73, 1.5, true), 50)
                onStreakUpdate(streak === 0 ? 1 : streak + 1, effectiveTarget)
            } else {
                playMetallicSound(200, 0.4)
                setTimeout(() => playMetallicSound(150, 0.4), 100)
                onStreakUpdate(0, null)
            }
        }, 400)
    }

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-auto transition-all duration-1000">
            <Canvas shadows gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 8, 12], fov: 40 }}
            // Removed global swipe to enforce interaction strictly on the coin mesh.
            >

                {/* Dramatic Indoor Spotlight - Widened */}
                <ambientLight intensity={0.5} color="#ffffff" />
                <spotLight
                    position={[0, 15, 0]}
                    angle={0.8}
                    penumbra={0.5}
                    intensity={250}
                    color="#fffcf5"
                    castShadow
                    shadow-mapSize={[512, 512]}
                />
                <pointLight position={[0, 2, 0]} intensity={3.5} color="#ffe066" distance={10} />

                <Suspense fallback={null}>
                    <Physics gravity={[0, -30, 0]} paused={true}>
                        <PhysicsStepper timeScale={timeScale} />
                        <CameraFollowController isFlipping={isFlipping} coinRef={coinRef as React.MutableRefObject<RapierRigidBody>} />
                        <CoinMesh
                            initialPosition={[0, 0.5, 0]}
                            onLanded={handleLanded}
                            isFlipping={isFlipping}
                            coinRef={coinRef}
                            onTossStarted={onTossStarted}
                            targetSide={targetSide}
                            projectedStreak={projectedStreak}
                            setTimeScale={setTimeScale}
                        />
                        <WoodTable />

                        {/* Ad Boards - Height expanded 3x (2.5 -> 7.5), completely lowered so they are visible on init */}
                        {/* Center/Back */}
                        <AdBoard position={[0, 0, -10]} rotation={[0, 0, 0]} width={10} height={7.5} label={"広告募集中"} />

                        {/* Left */}
                        <AdBoard position={[-12, 0, -5]} rotation={[0, Math.PI / 4, 0]} width={8} height={7.5} label={"広告募集中"} />

                        {/* Right */}
                        <AdBoard position={[12, 0, -5]} rotation={[0, -Math.PI / 4, 0]} width={8} height={7.5} label={"広告募集中"} />

                        <RigidBody type="fixed" restitution={0.3} friction={0.1}>
                            {/* Invisible physical wall placed slightly in front of the center ad boards to stop coin pass-through */}
                            <CuboidCollider args={[15, 50, 1]} position={[0, 0, -8.5]} />
                            <CuboidCollider args={[15, 50, 1]} position={[0, 0, 15]} />
                            <CuboidCollider args={[1, 50, 15]} position={[-8, 0, 0]} />
                            <CuboidCollider args={[1, 50, 15]} position={[8, 0, 0]} />
                            <CuboidCollider args={[15, 1, 15]} position={[0, 25, 0]} />
                        </RigidBody>
                    </Physics>

                    {/* Bloom Glow Effect */}
                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
                    </EffectComposer>
                </Suspense>
            </Canvas>
        </div>
    )
}
