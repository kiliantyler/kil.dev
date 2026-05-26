import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { ADMIN_TEST_BYPASS_COOKIE, ADMIN_TEST_BYPASS_COOKIE_VALUE } from '../../../src/lib/admin-test-bypass'
import {
  abortNoise,
  clickAndWaitForURLThenMain,
  disableAnimations,
  disableSeasonalOverlays,
  E2E_BASE_URL,
  gotoAndWaitForMain,
} from '../fixtures/test-helpers'

async function authorizeAdmin(context: BrowserContext) {
  await context.addCookies([
    {
      name: ADMIN_TEST_BYPASS_COOKIE,
      value: ADMIN_TEST_BYPASS_COOKIE_VALUE,
      url: E2E_BASE_URL,
      sameSite: 'Lax',
    },
  ])
}

async function gotoPetGalleryAdmin(page: Page) {
  await gotoAndWaitForMain(page, '/admin/pet-gallery')
  await expect(page.getByRole('heading', { level: 1, name: 'Pet Gallery Admin' })).toBeVisible()
}

async function openAdminTab(page: Page, name: 'Photos' | 'Animals' | 'Publish') {
  await page.getByRole('tab', { name }).click()
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function dropImageOnUpload(page: Page, fileName: string) {
  const dropzone = page.getByTestId('pet-gallery-upload-dropzone')

  await dropzone.dispatchEvent('drop', {
    dataTransfer: await page.evaluateHandle(name => {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(new File(['image-bytes'], name, { type: 'image/png' }))
      return dataTransfer
    }, fileName),
  })
}

async function pasteFile(page: Page, fileName: string, type: string) {
  await page.evaluate(
    ({ name, mimeType }) => {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(new File(['clipboard-bytes'], name, { type: mimeType }))
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true }))
    },
    { name: fileName, mimeType: type },
  )
}

async function pasteFileIntoCaption(page: Page, fileName: string, type: string) {
  await page.getByRole('textbox', { name: 'Caption' }).dispatchEvent('paste', {
    clipboardData: await page.evaluateHandle(
      ({ name, mimeType }) => {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(new File(['clipboard-bytes'], name, { type: mimeType }))
        return dataTransfer
      },
      { name: fileName, mimeType: type },
    ),
  })
}

async function expectPhotoGridOrder(page: Page, names: string[]) {
  const items = page.getByRole('list', { name: 'Photo grid' }).getByRole('listitem')
  await expect(items).toHaveCount(names.length)
  for (const [index, name] of names.entries()) {
    await expect(items.nth(index)).toContainText(name)
  }
}

async function chooseAdminSelect(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option }).click()
}

test.describe('Admin pet gallery', () => {
  test.beforeEach(async ({ page }) => {
    await disableSeasonalOverlays(page)
    await abortNoise(page)
    await disableAnimations(page)
  })

  test('signed-out admin requests are challenged before rendering admin UI', async ({ request }) => {
    for (const path of ['/admin', '/admin/pet-gallery']) {
      const response = await request.get(path, { maxRedirects: 0 })
      const body = await response.text()

      if (response.status() === 200) {
        expect(body).toMatch(/NEXT_REDIRECT|__next-page-redirect|\/auth\/sign-in/)
      } else {
        expect([302, 307, 308, 401, 403]).toContain(response.status())
      }
      expect(body).not.toContain('Edit Pet Gallery')
    }
  })

  test('UploadThing upload init rejects signed-out requests without admin middleware redirect', async ({ request }) => {
    const response = await request.post('/api/uploadthing?actionType=upload&slug=generatedImageVariant', {
      data: {
        files: [{ name: 'unauthorized.png', size: 128, type: 'image/png', lastModified: 1 }],
        input: null,
      },
      headers: {
        'Content-Type': 'application/json',
        'x-uploadthing-package': '@uploadthing/react',
        'x-uploadthing-version': '7.3.3',
      },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(403)
    expect(response.headers().location ?? '').not.toContain('workos')
  })

  test('authorized admin requests show the pet gallery editor link', async ({ context, page }) => {
    await authorizeAdmin(context)

    await gotoAndWaitForMain(page, '/admin')

    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit Pet Gallery' })).toBeVisible()
    await expect(page.locator('main [class*="bg-card"]')).toHaveCount(0)
  })

  test('authorized admin link navigates to the pet gallery admin route', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoAndWaitForMain(page, '/admin')

    await clickAndWaitForURLThenMain(
      page,
      page.getByRole('link', { name: 'Edit Pet Gallery' }),
      /\/admin\/pet-gallery$/,
    )

    await expect(page.getByRole('heading', { level: 1, name: 'Pet Gallery Admin' })).toBeVisible()
  })

  test('admin workspace exposes the first usable pet gallery sections', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: /Admin/i })).toHaveCount(0)
    await expect(page.getByRole('tablist', { name: 'Pet gallery admin sections' })).toBeVisible()
    const tabs = await page
      .getByRole('tab')
      .evaluateAll(elements => elements.map(element => element.getAttribute('aria-controls') ?? ''))
    for (const panelId of tabs) {
      expect(panelId).not.toBe('')
      await expect(page.locator(`#${panelId}`)).toHaveCount(1)
    }
    await expect(page.getByRole('tab', { name: 'Photos' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Upload entry' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Filter and sort controls' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Bulk actions' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Photo grid' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Selected photo editor' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Animal registry' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Publish panel' })).toHaveCount(0)

    await openAdminTab(page, 'Animals')
    await expect(page.getByRole('region', { name: 'Animal registry' })).toBeVisible()

    await openAdminTab(page, 'Publish')
    await expect(page.getByRole('region', { name: 'Publish panel' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Publish panel' })).toContainText(/Visible photos\s*3/)
    await expect(page.locator('main [class*="bg-card"]')).toHaveCount(0)
    await openAdminTab(page, 'Photos')
    await expect(page.getByRole('region', { name: 'Upload entry' })).toBeVisible()
  })

  test('mobile admin tabs keep the workspace focused without horizontal overflow', async ({ context, page }) => {
    await authorizeAdmin(context)
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoPetGalleryAdmin(page)

    await expect(page.getByRole('tablist', { name: 'Pet gallery admin sections' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Photo grid' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Animal registry' })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    const uploadBox = await page.getByRole('region', { name: 'Upload entry' }).boundingBox()
    const controlsBox = await page.getByRole('region', { name: 'Filter and sort controls' }).boundingBox()
    const bulkBox = await page.getByRole('region', { name: 'Bulk actions' }).boundingBox()
    const listBox = await page.getByRole('list', { name: 'Photo grid' }).boundingBox()
    expect(uploadBox).not.toBeNull()
    expect(controlsBox).not.toBeNull()
    expect(bulkBox).not.toBeNull()
    expect(listBox).not.toBeNull()
    expect(uploadBox!.y).toBeLessThan(controlsBox!.y)
    expect(controlsBox!.y).toBeLessThan(bulkBox!.y)
    expect(bulkBox!.y).toBeLessThan(listBox!.y)
    await expect(page.getByRole('region', { name: 'Selected photo editor' })).toHaveCount(0)

    await openAdminTab(page, 'Animals')
    await expect(page.getByRole('region', { name: 'Animal registry' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Photo grid' })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)

    await openAdminTab(page, 'Publish')
    await expect(page.getByRole('region', { name: 'Publish panel' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('tab selection is URL-backed and keyboard accessible', async ({ context, page }) => {
    await authorizeAdmin(context)

    await gotoAndWaitForMain(page, '/admin/pet-gallery?tab=animals')
    await expect(page.getByRole('tab', { name: 'Animals' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Animal registry' })).toBeVisible()

    await page.goto('/admin/pet-gallery?tab=unknown')
    await expect(page.getByRole('tab', { name: 'Photos' })).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('tab', { name: 'Photos' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Animals' })).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=animals/)
    await page.keyboard.press('End')
    await expect(page.getByRole('tab', { name: 'Publish' })).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=publish/)
  })

  test('search filters by caption, filename, or animal without mutating manual order', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    const manualOrder = page.getByTestId('manual-order-baseline')
    await expect(manualOrder).toHaveText('3 photos in manual order')
    await expectPhotoGridOrder(page, ['Aspen portrait', 'Sunny window', 'Mochi nap'])

    await page.getByLabel('Search photos').fill('window')
    await expect(page.getByRole('listitem', { name: /Sunny window/ })).toBeVisible()
    await expect(page.getByRole('listitem', { name: /Aspen portrait/ })).toHaveCount(0)
    await expect(manualOrder).toHaveText('3 photos in manual order')

    await page.getByLabel('Search photos').fill('aspen-snow.jpg')
    await expect(page.getByRole('listitem', { name: /Aspen portrait/ })).toBeVisible()
    await expect(page.getByRole('listitem', { name: /Sunny window/ })).toHaveCount(0)
    await expect(manualOrder).toHaveText('3 photos in manual order')

    await page.getByLabel('Search photos').fill('Mochi')
    await expect(page.getByRole('listitem', { name: /Mochi nap/ })).toBeVisible()
    await expect(manualOrder).toHaveText('3 photos in manual order')
  })

  test('drag and drop attaches image files to the upload queue', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await dropImageOnUpload(page, 'drop-cat.png')

    await expect(page.getByRole('list', { name: 'Upload queue' })).toContainText('drop-cat.png')
    await expect(page.getByText('Ready for UploadThing variants')).toBeVisible()
  })

  test('paste image attaches to the upload queue and non-image paste shows an error', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await pasteFile(page, 'pasted-dog.png', 'image/png')
    await expect(page.getByRole('list', { name: 'Upload queue' })).toContainText('pasted-dog.png')

    await page.getByRole('button', { name: 'Edit Aspen portrait' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit Aspen portrait' })).toBeVisible()
    await pasteFileIntoCaption(page, 'caption-paste.png', 'image/png')
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('list', { name: 'Upload queue' })).not.toContainText('caption-paste.png')

    await pasteFile(page, 'notes.txt', 'text/plain')
    await expect(page.getByText('Paste an image file to add it to the upload queue.')).toBeVisible()
  })

  test('inactive admin tabs do not handle global image paste uploads', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await openAdminTab(page, 'Animals')
    await pasteFile(page, 'inactive-tab-cat.png', 'image/png')
    await openAdminTab(page, 'Photos')

    await expect(page.getByText('inactive-tab-cat.png')).toHaveCount(0)
    await expect(page.getByText('Paste an image file to add it to the upload queue.')).toHaveCount(0)
  })

  test('bulk tagging applies the selected animal to selected photos', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await page.getByRole('button', { name: 'Select Sunny window' }).click()
    await page.getByRole('button', { name: 'Select Mochi nap' }).click()
    await chooseAdminSelect(page, 'Bulk animal', 'Aspen')
    await page.getByRole('button', { name: 'Apply animal to selected photos' }).click()

    await expect(page.getByRole('listitem', { name: /Sunny window/ })).toContainText('Aspen')
    await expect(page.getByRole('listitem', { name: /Mochi nap/ })).toContainText('Aspen')
    await expect(page.getByText('2 photos tagged with Aspen')).toBeVisible()
  })

  test('bulk selection controls select visible photos and clear the selection', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    const bulkActions = page.getByRole('region', { name: 'Bulk actions' })
    await expect(bulkActions).toContainText('0 selected')

    await page.getByRole('button', { name: 'Select all visible photos' }).click()
    await expect(bulkActions).toContainText('3 selected')
    await expect(page.getByRole('button', { name: 'Deselect Aspen portrait' })).toBeVisible()

    await page.getByRole('button', { name: 'Clear selected photos' }).click()
    await expect(bulkActions).toContainText('0 selected')
    await expect(page.getByRole('button', { name: 'Select Aspen portrait' })).toBeVisible()
  })

  test('bulk visibility controls update badges and visible photo counts', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await page.getByRole('button', { name: 'Select Sunny window' }).click()
    await page.getByRole('button', { name: 'Hide selected' }).click()

    await expect(page.getByRole('listitem', { name: /Sunny window/ })).toContainText('Hidden')
    await openAdminTab(page, 'Publish')
    await expect(page.getByRole('region', { name: 'Publish panel' })).toContainText(/Visible photos\s*2/)
    await openAdminTab(page, 'Photos')
    await expect(page.getByText('1 photos marked hidden')).toBeVisible()

    await page.getByRole('button', { name: 'Show selected' }).click()

    await expect(page.getByRole('listitem', { name: /Sunny window/ })).toContainText('Draft')
    await openAdminTab(page, 'Publish')
    await expect(page.getByRole('region', { name: 'Publish panel' })).toContainText(/Visible photos\s*3/)
    await openAdminTab(page, 'Photos')
    await expect(page.getByText('1 photos marked visible')).toBeVisible()
  })

  test('manual photo order can be adjusted from the keyboard-accessible row menu', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await expectPhotoGridOrder(page, ['Aspen portrait', 'Sunny window', 'Mochi nap'])
    await page.getByRole('button', { name: 'Actions for Sunny window' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeVisible()
    await page.keyboard.press('Enter')

    await expectPhotoGridOrder(page, ['Sunny window', 'Aspen portrait', 'Mochi nap'])
  })

  test('selected photo editor exposes full curation fields', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await page.getByRole('button', { name: 'Edit Aspen portrait' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit Aspen portrait' })).toBeVisible()
    await expect(page.getByLabel('Title')).toHaveValue('Aspen portrait')
    await page.getByLabel('Title').fill('Aspen cover')
    await page.getByLabel('Alt text').fill('Aspen standing in fresh snow')
    await page.getByRole('button', { name: 'Date', exact: true }).click()
    const dateButton = page.locator('button[data-day]').filter({ hasText: /^15$/ })
    await expect(dateButton).toHaveCount(1)
    await dateButton.click()
    await page.getByRole('switch', { name: 'Cover photo' }).click()
    await page.getByRole('switch', { name: 'Sunny', exact: true }).click()

    await expect(page.getByLabel('Title')).toHaveValue('Aspen cover')
    await expect(page.getByLabel('Alt text')).toHaveValue('Aspen standing in fresh snow')
    await expect(page.getByRole('button', { name: 'Date', exact: true })).not.toContainText('Select date')
    await expect(page.getByRole('button', { name: 'Clear date' })).toBeEnabled()
    await expect(page.getByRole('switch', { name: 'Cover photo' })).not.toBeChecked()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('listitem', { name: /Aspen cover/ })).toContainText('Sunny')
  })

  test('animal registry exposes species dropdown and color fields', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)
    await openAdminTab(page, 'Animals')

    const speciesSelect = page.getByRole('combobox', { name: 'Species for Aspen' })
    await expect(speciesSelect).toContainText('Dog')
    await speciesSelect.click()
    await expect(page.getByRole('option', { name: 'Cat' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Dog' })).toBeVisible()
    await page.getByRole('option', { name: 'Cat' }).click()
    await expect(speciesSelect).toContainText('Cat')
    await page.getByRole('button', { name: 'Actions for Aspen' }).click()
    await page.getByLabel('Color for Aspen').fill('#123456')

    await expect(page.getByLabel('Color for Aspen')).toHaveValue('#123456')
    await expect(page.getByLabel('Sort order for Aspen')).toHaveCount(0)
  })

  test('animal registry reorders rows by drag and drop', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)
    await openAdminTab(page, 'Animals')

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
    const aspenBox = await page.getByTestId('animal-aspen').boundingBox()
    expect(aspenBox).not.toBeNull()

    await page.getByRole('button', { name: 'Drag Mochi' }).dispatchEvent('dragstart', { dataTransfer })
    await page.getByTestId('animal-aspen').dispatchEvent('dragover', {
      clientY: aspenBox!.y + aspenBox!.height - 1,
      dataTransfer,
    })
    await page.getByTestId('animal-aspen').dispatchEvent('drop', {
      clientY: aspenBox!.y + aspenBox!.height - 1,
      dataTransfer,
    })
    await page.getByRole('button', { name: 'Drag Mochi' }).dispatchEvent('dragend', { dataTransfer })

    await expect
      .poll(() =>
        page
          .locator('[data-testid^="animal-"]')
          .evaluateAll(elements => elements.map(element => element.dataset.testid)),
      )
      .toEqual(['animal-aspen', 'animal-mochi', 'animal-sunny'])
  })

  test('animal hide flow removes it from the working list and allows restore', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)
    await openAdminTab(page, 'Animals')

    await page.getByRole('button', { name: 'Actions for Sunny' }).click()
    await page.getByRole('menuitem', { name: 'Hide' }).click()
    await expect(page.getByRole('group', { name: 'Confirm hide Sunny' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm hide Sunny' }).click()

    await expect(page.getByRole('region', { name: 'Available animals' })).not.toContainText('Sunny')
    await expect(page.getByText('Show hidden animals (1)')).toBeVisible()
    await page.getByText('Show hidden animals (1)').click()
    await expect(page.getByTestId('animal-sunny')).toContainText('Hidden from new tagging controls')
    await page.getByRole('button', { name: 'Restore Sunny' }).click()
    await expect(page.getByRole('region', { name: 'Available animals' }).getByLabel('Name for Sunny')).toBeVisible()
  })

  test('delete photo requires confirmation scoped to the selected photo', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await page.getByRole('button', { name: 'Edit Sunny window' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit Sunny window' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete selected photo' }).click()
    await expect(page.getByRole('group', { name: 'Confirm delete Sunny window' })).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await page.getByRole('button', { name: 'Edit Aspen portrait' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit Aspen portrait' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Confirm delete Sunny window' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Delete selected photo' }).click()
    await expect(page.getByRole('group', { name: 'Confirm delete Aspen portrait' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm delete Sunny window' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Confirm delete Aspen portrait' }).click()

    await expect(page.getByRole('listitem', { name: /Aspen portrait/ })).toHaveCount(0)
    await expect(page.getByRole('listitem', { name: /Sunny window/ })).toBeVisible()
  })

  test('hidden bulk target resets and cannot be applied to selected photos', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await chooseAdminSelect(page, 'Bulk animal', 'Sunny')
    await openAdminTab(page, 'Animals')
    await page.getByRole('button', { name: 'Actions for Sunny' }).click()
    await page.getByRole('menuitem', { name: 'Hide' }).click()
    await page.getByRole('button', { name: 'Confirm hide Sunny' }).click()
    await openAdminTab(page, 'Photos')

    await expect(page.getByRole('combobox', { name: 'Bulk animal' })).toContainText('Aspen')
    await page.getByRole('combobox', { name: 'Bulk animal' }).click()
    await expect(page.getByRole('option', { name: 'Sunny' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Select Mochi nap' }).click()
    await page.getByRole('button', { name: 'Apply animal to selected photos' }).click()

    await expect(page.getByRole('listitem', { name: /Mochi nap/ })).toContainText('Aspen')
    await expect(page.getByText('1 photos tagged with Aspen')).toBeVisible()
  })

  test('delete photo requires confirmation and removes it from the local grid', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await page.getByRole('button', { name: 'Edit Sunny window' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit Sunny window' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete selected photo' }).click()
    await expect(page.getByRole('group', { name: 'Confirm delete Sunny window' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm delete Sunny window' }).click()

    await expect(page.getByRole('listitem', { name: /Sunny window/ })).toHaveCount(0)
  })

  test('draft preview link opens a protected non-404 preview route', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)
    await openAdminTab(page, 'Publish')

    await expect(page.getByRole('link', { name: 'Open draft preview' })).toHaveAttribute(
      'href',
      '/admin/pet-gallery/preview',
    )
    await clickAndWaitForURLThenMain(
      page,
      page.getByRole('link', { name: 'Open draft preview' }),
      /\/admin\/pet-gallery\/preview$/,
    )
    await expect(page.getByRole('heading', { level: 1, name: 'Draft Pet Gallery Preview' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Aspen sitting in snow' }).first()).toHaveAttribute(
      'src',
      /petGalleryMock=photo-aspen|petGalleryMock%3Dphoto-aspen/,
    )
    await expect(page.getByText('404')).toHaveCount(0)
  })

  test('publish draft updates the session publish summary', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)
    await openAdminTab(page, 'Publish')

    await page.getByRole('button', { name: 'Publish draft' }).click()

    await expect(page.getByRole('region', { name: 'Publish panel' }).getByRole('status')).toContainText(
      'Published 3 photos and 3 animals.',
    )
    await expect(page.getByText(/Last published: (?!Not published in this session)/)).toBeVisible()
  })

  test('manual drag controls change draft order', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
    const aspenRow = page.getByRole('listitem', { name: /Aspen portrait/ })
    const aspenBox = await aspenRow.boundingBox()
    expect(aspenBox).not.toBeNull()

    await page.getByRole('button', { name: 'Drag Sunny window' }).dispatchEvent('dragstart', { dataTransfer })
    await aspenRow.dispatchEvent('dragover', {
      clientY: aspenBox!.y + 1,
      dataTransfer,
    })
    await aspenRow.dispatchEvent('drop', {
      clientY: aspenBox!.y + 1,
      dataTransfer,
    })
    await page.getByRole('button', { name: 'Drag Sunny window' }).dispatchEvent('dragend', { dataTransfer })

    await expect(page.getByTestId('manual-order-baseline')).toHaveText('3 photos in manual order')
    await expectPhotoGridOrder(page, ['Sunny window', 'Aspen portrait', 'Mochi nap'])
  })

  test('sorting and filtering do not mutate the manual published order baseline', async ({ context, page }) => {
    await authorizeAdmin(context)
    await gotoPetGalleryAdmin(page)

    await chooseAdminSelect(page, 'Sort photos', 'Filename')
    await expect(page.getByTestId('manual-order-baseline')).toHaveText('3 photos in manual order')
    await expect(page.getByTestId('published-order-baseline')).toHaveText('3 photos in published baseline')

    await chooseAdminSelect(page, 'Animal filter', 'Mochi')
    await expect(page.getByRole('listitem', { name: /Mochi nap/ })).toBeVisible()
    await expect(page.getByTestId('manual-order-baseline')).toHaveText('3 photos in manual order')
    await expect(page.getByTestId('published-order-baseline')).toHaveText('3 photos in published baseline')

    await chooseAdminSelect(page, 'Animal filter', 'All photos')
    await chooseAdminSelect(page, 'Sort photos', 'Manual order')
    await expectPhotoGridOrder(page, ['Aspen portrait', 'Sunny window', 'Mochi nap'])
  })
})
