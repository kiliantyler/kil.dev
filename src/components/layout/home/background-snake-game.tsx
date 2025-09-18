'use client'

import { GameOverlay } from '@/components/layout/home/game-overlay'
import { SnakeCanvas } from '@/components/layout/home/snake-canvas'
import { useTheme } from '@/components/providers/theme-provider'
import { useCrtAnimation } from '@/hooks/use-crt-animation'
import { useLeaderboard } from '@/hooks/use-leaderboard'
import { useSnakeGame } from '@/hooks/use-snake-game'
import { useCallback, useEffect, useMemo } from 'react'

export function BackgroundSnakeGame() {
  const { resolvedTheme } = useTheme()

  // Leaderboard and name input flow
  const {
    leaderboard,
    isLoadingLeaderboard,
    isSubmittingScore,
    showNameInput,
    playerName,
    nameInputPosition,
    setNameInputPosition,
    submitScore,
    handleGameOverFlow,
    handleNameInputKey,
  } = useLeaderboard()

  // Core game
  const { snake, food, isGoldenApple, gameOver, score, isPlaying, initGame, setIsPlaying, getDimensions } =
    useSnakeGame({
      isInputActive: showNameInput,
      onGameOver: (finalScore: number) => {
        void handleGameOverFlow(finalScore)
      },
    })

  // CRT animation
  const { showSnake, crtAnimation, isCrtOff, startCrtCloseAnimation } = useCrtAnimation({
    getDimensions,
  })

  const gameBox = useMemo(() => getDimensions(), [getDimensions])

  // Drawing callbacks
  const drawGameOverOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, dimensions: ReturnType<typeof getDimensions>) => {
      const { borderLeft, borderTop, borderWidth, borderHeight } = dimensions
      const cornerRadius = 12

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 100px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', borderLeft + borderWidth / 2, borderTop + 60)

      ctx.font = '40px VT323, monospace'
      ctx.fillText(`Score: ${score}`, borderLeft + borderWidth / 2, borderTop + 100)

      if (isLoadingLeaderboard) {
        ctx.fillStyle = '#10b981'
        ctx.font = '36px VT323, monospace'
        ctx.fillText('Loading leaderboard...', borderLeft + borderWidth / 2, borderTop + 140)
      } else if (leaderboard.length > 0) {
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 40px VT323, monospace'
        ctx.fillText('LEADERBOARD', borderLeft + borderWidth / 2, borderTop + 140)

        const startY = borderTop + 170
        const lineHeight = 20
        const maxEntries = Math.min(leaderboard.length, 10)
        const leaderboardWidth = 200
        const leaderboardLeft = borderLeft + (borderWidth - leaderboardWidth) / 2

        for (let i = 0; i < maxEntries; i++) {
          const entry = leaderboard[i]
          if (!entry) continue
          const y = startY + i * lineHeight
          if (entry.score === score) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
            ctx.fillRect(leaderboardLeft, y - 12, leaderboardWidth, lineHeight)
          }
          ctx.fillStyle = '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'left'
          ctx.fillText(`#${i + 1}`, leaderboardLeft + 10, y)

          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = 'bold 20px VT323, monospace'
          ctx.fillText(entry.name, leaderboardLeft + 40, y)

          ctx.fillStyle = entry.score === score ? '#ffffff' : '#10b981'
          ctx.font = '20px VT323, monospace'
          ctx.textAlign = 'right'
          ctx.fillText(entry.score.toString().padStart(4, '0'), leaderboardLeft + leaderboardWidth - 10, y)
        }
      }

      if (showNameInput) {
        const leaderboardHeight = leaderboard.length > 0 ? Math.min(leaderboard.length, 8) * 25 + 50 : 0
        const nameInputY = borderTop + 170 + leaderboardHeight + 20
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 32px VT323, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NEW HIGH SCORE!', borderLeft + borderWidth / 2, nameInputY)

        ctx.font = '24px VT323, monospace'
        ctx.fillText('Enter your initials:', borderLeft + borderWidth / 2, nameInputY + 30)

        const boxWidth = 30
        const boxSpacing = 20
        const totalWidth = boxWidth * 3 + boxSpacing * 2
        const nameStartX = borderLeft + borderWidth / 2 - totalWidth / 2
        const nameY = nameInputY + 60

        for (let i = 0; i < 3; i++) {
          const x = nameStartX + i * (boxWidth + boxSpacing)
          ctx.strokeStyle = nameInputPosition === i ? '#ffffff' : '#10b981'
          ctx.lineWidth = nameInputPosition === i ? 3 : 2
          ctx.strokeRect(x, nameY - 20, boxWidth, 30)
          ctx.fillStyle = '#10b981'
          ctx.font = 'bold 32px VT323, monospace'
          ctx.textAlign = 'center'
          ctx.fillText(playerName[i] ?? 'A', x + boxWidth / 2, nameY)
        }

        ctx.fillStyle = '#10b981'
        ctx.font = '20px VT323, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('↑↓ Change letter  ←→ Move  SPACE Next/Submit', borderLeft + borderWidth / 2, nameInputY + 110)

        if (isSubmittingScore) {
          ctx.fillStyle = '#ffffff'
          ctx.font = '24px VT323, monospace'
          ctx.textAlign = 'center'
          ctx.fillText('Submitting...', borderLeft + borderWidth / 2, nameInputY + 140)
        }
      }

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Press SPACE to restart', borderLeft + borderWidth / 2, borderTop + borderHeight - 30)

      ctx.fillStyle = '#ffffff'
      ctx.font = '18px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('ESC to quit', borderLeft + borderWidth / 2, borderTop + borderHeight - 10)
    },
    [isLoadingLeaderboard, leaderboard, nameInputPosition, playerName, score, showNameInput, isSubmittingScore],
  )

  const drawStartScreen = useCallback(
    (ctx: CanvasRenderingContext2D, dimensions: ReturnType<typeof getDimensions>) => {
      if (isPlaying || gameOver) return
      const {
        gridCellSize,
        gridOffset,
        borderLeft,
        borderTop,
        borderWidth,
        borderHeight,
        centerGridX,
        squareGridSize,
        safeYMin,
      } = dimensions
      const cornerRadius = 12

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.beginPath()
      ctx.roundRect(borderLeft, borderTop, borderWidth, borderHeight, cornerRadius)
      ctx.fill()

      type Letter = 'S' | 'N' | 'A' | 'K' | 'E'
      const letters: Letter[] = ['S', 'N', 'A', 'K', 'E']
      const spacing = 1
      const glyph3x5: Record<Letter, string[]> = {
        S: ['111', '100', '111', '001', '111'],
        N: ['111', '101', '101', '101', '101'],
        A: ['010', '101', '111', '101', '101'],
        K: ['101', '101', '110', '101', '101'],
        E: ['111', '100', '110', '100', '111'],
      }
      const glyph: Record<Letter, string[]> = glyph3x5
      const letterW = 3
      const letterH = 5
      const totalWordW = letters.length * letterW + (letters.length - 1) * spacing
      const xStartGrid = centerGridX + Math.max(0, Math.floor((squareGridSize - totalWordW) / 2))
      const yCenter = safeYMin + Math.floor(squareGridSize / 2)
      const yStartGrid = Math.max(safeYMin + 1, yCenter - Math.floor(letterH / 2) - 2)

      ctx.fillStyle = '#10b981'
      for (let i = 0; i < letters.length; i++) {
        const ch = letters[i]
        if (!ch) continue
        const rows = glyph[ch]
        if (!rows) continue
        const letterX = xStartGrid + i * (letterW + spacing)
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] ?? ''
          for (let c = 0; c < row.length; c++) {
            if (row[c] !== '1') continue
            const gx = (letterX + c) * gridCellSize + gridOffset
            const gy = (yStartGrid + r) * gridCellSize + gridOffset
            ctx.fillRect(gx + 2, gy + 2, gridCellSize - 4, gridCellSize - 4)
          }
        }
      }

      const centerXPx = borderLeft + borderWidth / 2
      ctx.fillStyle = '#ffffff'
      ctx.font = '28px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Use arrow keys to move', centerXPx, borderTop + borderHeight - 60)
      ctx.fillText('Press SPACE to start', centerXPx, borderTop + borderHeight - 30)

      ctx.fillStyle = '#ffffff'
      ctx.font = '20px VT323, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('ESC to quit', centerXPx, borderTop + borderHeight - 10)
    },
    [isPlaying, gameOver],
  )

  // Keyboard orchestration for overlay/name input
  const onNameInputKey = useCallback(
    (e: KeyboardEvent) => {
      if (!showNameInput) return
      if (e.key === ' ') {
        e.preventDefault()
        if (nameInputPosition < 2) {
          setNameInputPosition(prev => Math.min(2, prev + 1))
        } else {
          void submitScore(score)
        }
        return
      }
      handleNameInputKey(e)
    },
    [showNameInput, nameInputPosition, setNameInputPosition, submitScore, score, handleNameInputKey],
  )

  // Body class for grid lights
  useEffect(() => {
    if (isPlaying) document.body.classList.add('snake-game-active')
    else document.body.classList.remove('snake-game-active')
    return () => document.body.classList.remove('snake-game-active')
  }, [isPlaying])

  return (
    <>
      <SnakeCanvas
        snake={snake}
        food={food}
        isGoldenApple={isGoldenApple}
        crtAnimation={crtAnimation}
        gameBox={gameBox}
        showSnake={showSnake && !isCrtOff}
        theme={resolvedTheme}
        isPlaying={isPlaying}
        gameOver={gameOver}
        drawGameOverOverlay={drawGameOverOverlay}
        drawStartScreen={drawStartScreen}
      />

      <GameOverlay
        isPlaying={isPlaying}
        gameOver={gameOver}
        score={score}
        showNameInput={showNameInput}
        playerName={playerName}
        nameInputPosition={nameInputPosition}
        isSubmittingScore={isSubmittingScore}
        dimensions={gameBox}
        onRestart={() => initGame()}
        onEsc={() => {
          setIsPlaying(false)
          startCrtCloseAnimation()
        }}
        onNameInputKey={onNameInputKey}
      />

      {isPlaying &&
        (() => {
          const { borderLeft, borderTop } = gameBox
          return (
            <div
              className="absolute z-50 bg-black/40 text-white px-4 py-2 rounded-lg border border-green-500/30 shadow-lg"
              style={{ top: `${borderTop + 8}px`, left: `${borderLeft + 8}px` }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-lg font-bold text-green-400" style={{ fontFamily: 'VT323, monospace' }}>
                  SCORE: <span className="text-white">{score}</span>
                </span>
              </div>
            </div>
          )
        })()}
    </>
  )
}
