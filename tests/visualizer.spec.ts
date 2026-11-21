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
