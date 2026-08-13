import { useNavigate } from '@tanstack/react-router'
import Banner from '@douyinfe/semi-ui/lib/es/banner'
import Button from '@douyinfe/semi-ui/lib/es/button'
import Input from '@douyinfe/semi-ui/lib/es/input'
import Tag from '@douyinfe/semi-ui/lib/es/tag'
import { IconArrowRight, IconShield } from '@douyinfe/semi-icons'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Brand } from '../components/brand'
import { LocaleSwitcher } from '../components/locale-switcher'
import { apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { healthQueryOptions, setupStatusQueryOptions } from '../lib/queries'
import { useToast } from '../lib/toast'
import { m } from '../paraglide/messages.js'

const loginSchema = z.object({
  login: z.string().trim().min(1, m.auth_login_required()),
  password: z.string().min(1, m.auth_password_required()),
})

const setupSchema = z.object({
  token: z.string().trim().min(1, m.auth_setup_token_missing()),
  username: z.string().trim().min(2, m.auth_username_min()),
  email: z.string().email(m.auth_email_invalid()),
  password: z.string().min(8, m.auth_password_min()),
})

function PasswordField({
  value,
  onChange,
  autoComplete,
}: {
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  return (
    <Input
      className="password-input"
      id="password"
      mode="password"
      value={value}
      onChange={onChange}
      placeholder="••••••••"
      autoComplete={autoComplete}
      aria-label={m.common_password()}
    />
  )
}

export function LoginPage({ redirect }: { redirect?: string }) {
  const { login, authenticated } = useAuth()
  const health = useQuery(healthQueryOptions())
  const navigate = useNavigate()
  const { notify } = useToast()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (authenticated) {
      void navigate({ to: redirect || '/' })
    }
  }, [authenticated, navigate, redirect])

  return (
    <main className="auth-page">
      <Brand />
      <LocaleSwitcher className="auth-locale" />
      <section className="auth-card">
        <header>
          <h1>{m.auth_welcome_back()}</h1>
          <p>{m.auth_login_subtitle()}</p>
        </header>
        <Tag
          className={`api-status ${health.isSuccess ? 'api-status-online' : 'api-status-offline'}`}
          color={health.isSuccess ? 'green' : 'red'}
          size="large"
        >
          {health.isSuccess
            ? m.auth_api_online({ version: health.data.version })
            : m.auth_api_unavailable()}
        </Tag>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            const parsed = loginSchema.safeParse({ login: loginValue, password })
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message || m.common_check_details())
              return
            }
            setSubmitting(true)
            try {
              await login(parsed.data)
              notify(m.auth_login_success(), 'success')
              await navigate({ to: redirect || '/' })
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : m.auth_login_failed())
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <label className="field">
            <span>{m.auth_email_or_username()}</span>
            <Input
              type="text"
              value={loginValue}
              onChange={setLoginValue}
              placeholder={m.auth_email_placeholder()}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="field">
            <span>{m.common_password()}</span>
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <Banner
              className="form-error"
              type="danger"
              fullMode={false}
              description={error}
              closeIcon={null}
            />
          )}
          <Button
            htmlType="submit"
            theme="solid"
            type="primary"
            block
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? m.auth_logging_in() : m.auth_login()}
          </Button>
        </form>
      </section>
    </main>
  )
}

export function SetupPage({ token }: { token?: string }) {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [username, setUsername] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const setupStatus = useQuery(setupStatusQueryOptions())

  const missingToken = setupStatus.isSuccess && setupStatus.data.needs_setup && !token
  const alreadySetup = setupStatus.isSuccess && !setupStatus.data.needs_setup

  return (
    <main className="auth-page setup-page">
      <Brand />
      <LocaleSwitcher className="auth-locale" />
      <section className="auth-card setup-card">
        <header>
          <span className="setup-icon">
            <IconShield size="large" />
          </span>
          <h1>{m.setup_title()}</h1>
          <p>{m.setup_subtitle()}</p>
        </header>
        {missingToken && (
          <Banner
            type="warning"
            fullMode={false}
            title={m.setup_token_required()}
            description={m.setup_token_help()}
            closeIcon={null}
          />
        )}
        {alreadySetup && (
          <Banner
            type="info"
            fullMode={false}
            title={m.setup_already_configured()}
            description={m.setup_already_help()}
            closeIcon={null}
          />
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            const parsed = setupSchema.safeParse({ token, username, email, password })
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message || m.common_check_details())
              return
            }
            setSubmitting(true)
            try {
              await apiRequest<boolean>('/setup', { method: 'POST', body: parsed.data })
              notify(m.setup_ready(), 'success')
              await navigate({ to: '/login' })
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : m.setup_failed())
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <label className="field">
            <span>{m.setup_username()}</span>
            <Input value={username} onChange={setUsername} autoComplete="username" />
          </label>
          <label className="field">
            <span>{m.common_email()}</span>
            <Input
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="admin@domain.ltd"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>{m.common_password()}</span>
            <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
            <small>{m.setup_password_hint()}</small>
          </label>
          {error && (
            <Banner
              className="form-error"
              type="danger"
              fullMode={false}
              description={error}
              closeIcon={null}
            />
          )}
          <Button
            htmlType="submit"
            theme="solid"
            type="primary"
            block
            icon={!submitting ? <IconArrowRight /> : undefined}
            loading={submitting}
            disabled={submitting || missingToken || alreadySetup}
          >
            {submitting ? m.setup_creating() : m.setup_finish()}
          </Button>
          {alreadySetup && (
            <Button block onClick={() => navigate({ to: '/login' })}>
              {m.setup_go_login()}
            </Button>
          )}
        </form>
      </section>
    </main>
  )
}
