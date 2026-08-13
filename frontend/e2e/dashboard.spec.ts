import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const admin = {
  username: 'e2e-admin',
  email: 'e2e-admin@example.test',
  password: 'E2e-password-123!',
}

test('setup, login, protected routes, CRUD, responsive navigation, and logout', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000)
  await expect
    .poll(async () => readFile('./output/e2e/setup-token.txt', 'utf8').catch(() => ''))
    .not.toBe('')
  const token = await readFile('./output/e2e/setup-token.txt', 'utf8')

  await page.goto(`/dash/setup?token=${encodeURIComponent(token)}`)
  await page.getByLabel('Username').fill(admin.username)
  await page.getByLabel('Email').fill(admin.email)
  await page.locator('input[autocomplete="new-password"]').fill(admin.password)
  await page.getByRole('button', { name: 'Finish setup' }).click()
  await expect(page).toHaveURL(/\/dash\/login/)

  await expect(page.getByText(/API online/)).toBeVisible()
  await page.getByLabel('Email').fill(admin.email)
  await page.locator('input[autocomplete="current-password"]').fill(admin.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/dash\/?$/)
  await expect(page.getByRole('heading', { name: /Welcome back, e2e-admin/ })).toBeVisible({
    timeout: 15_000,
  })

  const sessionStatus = await page.evaluate(async () =>
    fetch('/api/auth/me', { credentials: 'include' }).then((response) => response.status),
  )
  expect(sessionStatus).toBe(200)
  expect(await page.evaluate(() => localStorage.getItem('fastschema.dashboard.token'))).toBeNull()
  const tokenCookie = (await context.cookies()).find((cookie) => cookie.name === 'token')
  expect(tokenCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' })

  await page.goto('/dash/users/create')
  await page.getByLabel('Username').fill('content-editor')
  await page.getByLabel('Email').fill('content-editor@example.test')
  await page.locator('input[autocomplete="new-password"]').fill('User-password-123!')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/dash\/users\/?$/)
  await expect(page.getByText('content-editor', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Delete content-editor' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'confirm' }).click()
  await expect(page.getByText('content-editor', { exact: true })).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open sidebar' }).click()
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()
  await page
    .getByRole('complementary')
    .getByRole('link', { name: 'Dashboard', exact: true })
    .click()

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.locator('.user-button').click()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/dash\/login/)
  expect((await context.cookies()).find((cookie) => cookie.name === 'token')).toBeUndefined()

  await page.goto('/dash/users')
  await expect(page).toHaveURL(/\/dash\/login\?redirect=/)
})
