import { expect, test } from '@playwright/test'

test('opens an application, inspects hardware and returns through breadcrumbs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('region', { name: 'Application carousel' }).getByRole('button', { name: /Meridian/ }).click()
  const inspector = page.getByRole('complementary', { name: 'Asset inspector' })
  await expect(inspector.getByRole('heading', { name: 'Meridian' })).toBeVisible()
  await inspector.getByRole('button', { name: /Compute 01/ }).click()
  await expect(inspector.getByRole('heading', { name: 'Compute 01' })).toBeVisible()
  await inspector.getByRole('button', { name: /Drive 02/ }).click()
  await expect(inspector.getByRole('heading', { name: 'Drive 02' })).toBeVisible()
  await inspector.getByRole('button', { name: /Control board/ }).click()
  await expect(inspector.getByRole('heading', { name: 'Drive Controller' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(inspector.getByRole('heading', { name: 'Drive 02' })).toBeVisible()
  await page.getByRole('button', { name: 'All Applications' }).click()
  await expect(page.getByRole('region', { name: 'Application carousel' })).toBeVisible()
})

test('changes inspector metrics through both lens controls and shortcuts', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('region', { name: 'Application carousel' }).getByRole('button', { name: /Meridian/ }).click()
  const lenses = page.getByRole('group', { name: 'Analytical lens' })
  const inspector = page.getByRole('complementary', { name: 'Asset inspector' })
  await lenses.getByRole('button', { name: 'Power Consumption' }).click()
  await expect(lenses.getByRole('button', { name: 'Power Consumption' })).toHaveAttribute('aria-pressed', 'true')
  await expect(inspector.getByText('598 W', { exact: true })).toBeVisible()
  await page.keyboard.press('3')
  await expect(lenses.getByRole('button', { name: 'Carbon Footprint' })).toHaveAttribute('aria-pressed', 'true')
  await expect(inspector.getByText('185.4 gCO₂e/h', { exact: true })).toBeVisible()
})

test('keeps asset navigation available with WebGL disabled', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, type: string, ...options: unknown[]) {
        if (type.startsWith('webgl')) return null
        return Reflect.apply(getContext, this, [type, ...options])
      }
    })
  })
  await page.goto('/')
  await expect(page.getByText(/3D view unavailable/)).toBeVisible()
  await page.getByRole('region', { name: 'Application carousel' }).getByRole('button', { name: /Meridian/ }).click()
  await page.getByRole('button', { name: /Compute 01/ }).click()
  await expect(page.getByRole('heading', { name: 'Compute 01' })).toBeVisible()
})

test('moves the carousel to the right and supports vertical dragging', async ({ page }) => {
  await page.goto('/fleet.html')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'Right side' }).check()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.locator('.atlas')).toHaveAttribute('data-carousel-position', 'right')
  const strip = page.locator('.carousel-strip')
  await expect(strip).toHaveAttribute('data-axis', 'vertical')
  const dimensions = await strip.evaluate(element => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }))
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight)

  const card = strip.locator('.app-card').first()
  const bounds = await card.boundingBox()
  if (!bounds) throw new Error('First application card is not visible')
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 120, { steps: 6 })
  await expect(strip).toHaveAttribute('data-dragging', 'true')
  await page.mouse.up()
  await expect.poll(() => strip.evaluate(element => element.scrollTop)).toBeGreaterThan(0)

  await page.reload()
  const atlas = page.locator('.atlas')
  await expect(atlas).toHaveAttribute('data-carousel-position', 'right')
  await strip.locator('.app-card').first().click()
  await expect(atlas).toHaveAttribute('data-overview', 'false')
  await expect(page.getByRole('region', { name: 'Application carousel' })).toHaveCount(0)
  const inspector = await page.getByRole('complementary', { name: 'Asset inspector' }).boundingBox()
  if (!inspector) throw new Error('Inspector is not visible')
  expect(inspector.x).toBeGreaterThan(640)
})

test('places the lens selector beside the ranking legend on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 655, height: 720 })
  await page.goto('/')
  const lens = await page.getByRole('group', { name: 'Analytical lens' }).boundingBox()
  const legend = await page.getByRole('region', { name: /ranking/ }).boundingBox()
  if (!lens || !legend) throw new Error('Lens selector or ranking legend is not visible')
  expect(Math.abs(lens.y + lens.height / 2 - legend.y - legend.height / 2)).toBeLessThan(3)
  expect(lens.x + lens.width).toBeLessThanOrEqual(legend.x)
  expect(legend.x + legend.width).toBeLessThanOrEqual(655)
})
