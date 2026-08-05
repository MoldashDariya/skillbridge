"use client"

import { useEffect } from "react"
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas"

interface SkillyMascotProps {
  /** Tailwind classes controlling the wrapper div size, e.g. "w-32 h-32" */
  className?: string
  /** Rive state machine name. Omit to autoplay the default animation. */
  stateMachine?: string
  /** Name of the trigger input to fire (default: "Wave") */
  waveInput?: string
  /** Fire the wave trigger automatically on mount (requires stateMachine) */
  triggerWave?: boolean
  /** Disable pointer events on the canvas (useful in hero overlaps) */
  pointerEventsNone?: boolean
}

export function SkillyMascot({
  className = "w-32 h-32",
  stateMachine,
  waveInput = "Wave",
  triggerWave = false,
  pointerEventsNone = false,
}: SkillyMascotProps) {
  const { rive, RiveComponent } = useRive({
    src: "/skilly.riv",
    ...(stateMachine ? { stateMachines: stateMachine } : {}),
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  })

  const waveTrigger = useStateMachineInput(
    stateMachine ? rive : null,
    stateMachine ?? "",
    waveInput,
  )

  useEffect(() => {
    if (!triggerWave || !waveTrigger) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(waveTrigger as any).fire?.()
    } catch {
      // Graceful no-op if trigger type or name mismatches
    }
  }, [triggerWave, waveTrigger])

  return (
    <div
      className={className}
      style={{ pointerEvents: pointerEventsNone ? "none" : undefined }}
    >
      <RiveComponent style={{ background: "transparent" }} />
    </div>
  )
}
