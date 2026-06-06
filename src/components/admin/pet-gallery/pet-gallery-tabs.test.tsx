import { chromium, type Page } from '@playwright/test'
import { build } from 'esbuild'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildPetGalleryAdminTabDefinitions,
  normalizePetGalleryAdminTab,
  PET_GALLERY_ADMIN_TABS,
} from './pet-gallery-tabs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../../..')

async function buildPetGalleryTabsTestPage() {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'pet-gallery-tabs-'))
  const entryPath = path.join(tempDir, 'entry.tsx')
  await writeFile(
    entryPath,
    `
      import { PetGalleryTabs, type PetGalleryAdminTab } from '${path
        .join(__dirname, 'pet-gallery-tabs.tsx')
        .replaceAll('\\', '/')}'
      import { createElement, useState } from 'react'
      import { createRoot } from 'react-dom/client'

      declare global {
        interface Window {
          petGalleryTabCalls: PetGalleryAdminTab[]
        }
      }

      function TestHarness() {
        const [activeTab, setActiveTab] = useState<PetGalleryAdminTab>('animals')

        return createElement(PetGalleryTabs, {
          activeTab,
          onTabChange(tab) {
            window.petGalleryTabCalls.push(tab)
            setActiveTab(tab)
          },
        })
      }

      window.petGalleryTabCalls = []
      createRoot(document.getElementById('root')!).render(createElement(TestHarness))
    `,
  )

  const bundle = await build({
    absWorkingDir: repoRoot,
    bundle: true,
    define: {
      'process.env.NODE_ENV': '"test"',
    },
    entryPoints: [entryPath],
    format: 'iife',
    jsx: 'automatic',
    nodePaths: [path.join(repoRoot, 'node_modules')],
    platform: 'browser',
    write: false,
  })

  return `<!doctype html><html><body><div id="root"></div><script>${bundle.outputFiles[0]?.text ?? ''}</script></body></html>`
}

async function openPetGalleryTabsPage(page: Page, html: string) {
  await page.route('https://kil.test/admin/pet-gallery?tab=animals', route =>
    route.fulfill({ body: html, contentType: 'text/html' }),
  )
  await page.goto('https://kil.test/admin/pet-gallery?tab=animals')
}

describe('PetGalleryTabs', () => {
  it('preserves the pet gallery tab values, ids, labels, and default normalization', () => {
    expect(PET_GALLERY_ADMIN_TABS).toEqual(['photos', 'animals', 'publish'])
    expect(normalizePetGalleryAdminTab('unknown')).toBe('photos')
    expect(buildPetGalleryAdminTabDefinitions()).toEqual([
      { value: 'photos', label: 'Photos', panelId: 'pet-gallery-photos-panel', tabId: 'pet-gallery-photos-tab' },
      { value: 'animals', label: 'Animals', panelId: 'pet-gallery-animals-panel', tabId: 'pet-gallery-animals-tab' },
      { value: 'publish', label: 'Publish', panelId: 'pet-gallery-publish-panel', tabId: 'pet-gallery-publish-tab' },
    ])
  })

  it('renders accessible admin tabs and calls back when a tab is selected', async () => {
    const html = await buildPetGalleryTabsTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openPetGalleryTabsPage(page, html)

      const tablist = page.getByRole('tablist', { name: 'Pet gallery admin sections' })
      await expect(tablist.count()).resolves.toBe(1)
      await expect(page.getByTestId('pet-gallery-admin-tabs').count()).resolves.toBe(1)

      await expect(page.getByRole('tab', { name: 'Photos' }).getAttribute('id')).resolves.toBe('pet-gallery-photos-tab')
      await expect(page.getByRole('tab', { name: 'Photos' }).getAttribute('aria-controls')).resolves.toBe(
        'pet-gallery-photos-panel',
      )
      await expect(page.getByRole('tab', { name: 'Animals' }).getAttribute('id')).resolves.toBe(
        'pet-gallery-animals-tab',
      )
      await expect(page.getByRole('tab', { name: 'Animals' }).getAttribute('aria-controls')).resolves.toBe(
        'pet-gallery-animals-panel',
      )
      await expect(page.getByRole('tab', { name: 'Publish' }).getAttribute('id')).resolves.toBe(
        'pet-gallery-publish-tab',
      )
      await expect(page.getByRole('tab', { name: 'Publish' }).getAttribute('aria-controls')).resolves.toBe(
        'pet-gallery-publish-panel',
      )

      await expect(page.getByRole('tab', { name: 'Animals' }).getAttribute('aria-selected')).resolves.toBe('true')
      await page.getByRole('tab', { name: 'Publish' }).click()

      await expect(
        page.evaluate(() => (globalThis as unknown as { petGalleryTabCalls: string[] }).petGalleryTabCalls),
      ).resolves.toEqual(['publish'])
      await expect(page.getByRole('tab', { name: 'Publish' }).getAttribute('aria-selected')).resolves.toBe('true')
      expect(new URL(page.url()).searchParams.get('tab')).toBe('publish')

      await page.getByRole('tab', { name: 'Photos' }).click()

      await expect(
        page.evaluate(() => (globalThis as unknown as { petGalleryTabCalls: string[] }).petGalleryTabCalls),
      ).resolves.toEqual(['publish', 'photos'])
      await expect(page.getByRole('tab', { name: 'Photos' }).getAttribute('aria-selected')).resolves.toBe('true')
      expect(new URL(page.url()).searchParams.has('tab')).toBe(false)
    } finally {
      await page.close()
      await browser.close()
    }
  })
})
