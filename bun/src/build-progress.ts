type ProgressStream = {
  isTTY?: boolean
  write(value: string): unknown
}

export type RakunBuildProgress = {
  complete(message?: string): void
  fail(message?: string): void
  update(message: string): void
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const CLEAR_LINE = '\r\u001B[2K'
const RESET = '\u001B[0m'

const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1_000) return `${Math.round(milliseconds)}ms`
  return `${(milliseconds / 1_000).toFixed(1)}s`
}

export const createRakunBuildProgress = (
  stream: ProgressStream = process.stderr
): RakunBuildProgress => {
  const interactive = stream.isTTY === true
  const colors = interactive && !('NO_COLOR' in process.env)
  const color = (code: number, value: string): string =>
    colors ? `\u001B[${code}m${value}${RESET}` : value
  const startedAt = performance.now()
  let finished = false
  let frame = 0
  let message: string | undefined
  let phaseStartedAt = startedAt
  let timer: ReturnType<typeof setInterval> | undefined

  const render = (): void => {
    if (!interactive || !message) return
    const elapsed = color(2, formatDuration(performance.now() - phaseStartedAt))
    const currentFrame = FRAMES.at(frame % FRAMES.length) ?? '•'
    stream.write(`${CLEAR_LINE}  ${color(36, currentFrame)} ${message} ${elapsed}`)
    frame += 1
  }

  const stopTimer = (): void => {
    if (!timer) return
    clearInterval(timer)
    timer = undefined
  }

  const finishPhase = (symbol = '✓', colorCode = 32): void => {
    if (!interactive || !message) return
    stopTimer()
    const elapsed = color(2, formatDuration(performance.now() - phaseStartedAt))
    stream.write(`${CLEAR_LINE}  ${color(colorCode, symbol)} ${message} ${elapsed}\n`)
  }

  const finish = (symbol: string, colorCode: number, finalMessage: string): void => {
    if (finished) return
    finished = true
    finishPhase(symbol, colorCode)
    stopTimer()
    message = undefined
    const elapsed = formatDuration(performance.now() - startedAt)
    stream.write(`  ${color(colorCode, symbol)} ${finalMessage} ${color(2, elapsed)}\n`)
  }

  return {
    complete(finalMessage = 'Build completed') {
      finish('✓', 32, finalMessage)
    },
    fail(finalMessage = 'Build failed') {
      finish('✗', 31, finalMessage)
    },
    update(nextMessage) {
      if (finished || nextMessage === message) return
      finishPhase()
      message = nextMessage
      phaseStartedAt = performance.now()
      frame = 0
      if (!interactive) {
        stream.write(`  • ${message}\n`)
        return
      }
      render()
      timer = setInterval(render, 80)
      timer.unref()
    },
  }
}
