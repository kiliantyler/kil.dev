import { expect, test, type Page } from '@playwright/test'
import { simulateKonamiCode } from '../fixtures/achievement-helpers'
import { abortNoise, clearState, gotoAndWaitForMain } from '../fixtures/test-helpers'

type SnakeCanvasTextEvent = {
  text: string
  time: number
}

type SnakeCanvasTextGlobal = typeof globalThis & {
  __snakeCanvasTextEvents?: SnakeCanvasTextEvent[]
  __snakeCanvasTextRecorderInstalled?: boolean
}

async function installCanvasTextRecorder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const win = globalThis as SnakeCanvasTextGlobal
    if (win.__snakeCanvasTextRecorderInstalled) return

    win.__snakeCanvasTextEvents = []
    win.__snakeCanvasTextRecorderInstalled = true

    const originalFillText = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (
      text: string,
      x: number,
      y: number,
      maxWidth?: number,
    ): void {
      const events = win.__snakeCanvasTextEvents ?? []
      events.push({ text, time: performance.now() })
      if (events.length > 1000) {
        events.splice(0, events.length - 1000)
      }
      win.__snakeCanvasTextEvents = events

      if (maxWidth === undefined) {
        return originalFillText.call(this, text, x, y)
      }
      return originalFillText.call(this, text, x, y, maxWidth)
    }
  })
}

async function clearCanvasTextEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = globalThis as SnakeCanvasTextGlobal
    win.__snakeCanvasTextEvents = []
  })
}

/**
 * Helper to check if game is over
 */
async function isGameOver(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      return !document.body.classList.contains('snake-game-active')
    })
    .catch(() => false)
}

/**
 * Wait for leaderboard to finish loading by checking the canvas text rendered
 * in recent game-over frames. A resolved empty leaderboard is valid, but a
 * frame that is still drawing "Loading leaderboard..." is not.
 */
async function waitForLeaderboardLoad(page: Page, timeoutMs = 5000): Promise<void> {
  await expect
    .poll(
      async () => {
        return await page.evaluate(() => {
          const win = globalThis as SnakeCanvasTextGlobal
          const events = win.__snakeCanvasTextEvents ?? []
          const recentTexts = new Set(
            events.filter(event => performance.now() - event.time < 250).map(event => event.text),
          )

          return (
            !document.body.classList.contains('snake-game-active') &&
            recentTexts.has('GAME OVER') &&
            !recentTexts.has('Loading leaderboard...')
          )
        })
      },
      {
        message: 'leaderboard should leave the canvas loading state',
        timeout: timeoutMs,
        intervals: [200, 300, 500],
      },
    )
    .toBe(true)
}

test.describe('Snake Game Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await installCanvasTextRecorder(page)
    await clearState(page)
    await abortNoise(page)
    // Don't disable animations - we need the game to work properly
  })

  test('should resolve leaderboard loading on game over', async ({ page }) => {
    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    await gotoAndWaitForMain(page, '/')
    await page.waitForTimeout(500)

    // Trigger Konami code to start snake game
    await simulateKonamiCode(page)
    await page.waitForTimeout(1000)

    // Start the game
    await page.keyboard.press('Space')
    await page.waitForTimeout(500)

    // Immediately trigger game over by moving into wall
    // This is fast - we just need to see the leaderboard, not play the game
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(150)
    }

    // Wait for game over screen
    await page.waitForFunction(() => !document.body.classList.contains('snake-game-active'), {
      timeout: 5000,
    })

    await clearCanvasTextEvents(page)
    await waitForLeaderboardLoad(page, 5000)

    // Verify leaderboard displays by checking:
    // 1. Game over state is active
    // 2. Canvas exists and is rendering
    const gameOverState = await isGameOver(page)
    expect(gameOverState).toBe(true)

    const canvasExists = await page.evaluate(() => {
      return document.querySelector('canvas') !== null
    })
    expect(canvasExists).toBe(true)

    // Verify canvas is rendering (leaderboard should be visible on game over)
    const canvasRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      return canvas !== null && canvas.width > 0 && canvas.height > 0
    })
    expect(canvasRendering).toBe(true)
    expect(consoleMessages.some(message => message.includes('Game session start response:'))).toBe(false)
  })
})
