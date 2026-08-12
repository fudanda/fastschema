import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Brand } from '../components/brand'
import { apiRequest } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

const loginSchema = z.object({
  login: z.string().trim().min(1, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
})

const setupSchema = z.object({
  token: z.string().trim().min(1, 'The setup token is missing'),
  username: z.string().trim().min(2, 'Use at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
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
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-input">
      <input
        id="password"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="••••••••"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="icon-button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export function LoginPage({ redirect }: { redirect?: string }) {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      void navigate({ to: redirect || '/' })
    }
  }, [navigate, redirect, token])

  return (
    <main className="auth-page">
      <Brand />
      <section className="auth-card">
        <header>
          <h1>Welcome back</h1>
          <p>Log in to your account to continue</p>
        </header>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            const parsed = loginSchema.safeParse({ login: loginValue, password })
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message || 'Check your details')
              return
            }
            setSubmitting(true)
            try {
              await login(parsed.data)
              notify('Login successful', 'success')
              await navigate({ to: redirect || '/' })
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : 'Login failed')
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <label className="field">
            <span>Email</span>
            <input
              type="text"
              value={loginValue}
              onChange={(event) => setLoginValue(event.target.value)}
              placeholder="email@domain.ltd"
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="field">
            <span>Password</span>
            <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button button-primary button-block" disabled={submitting}>
            {submitting ? <span className="spinner spinner-light" /> : null}
            {submitting ? 'Logging in…' : 'Login'}
          </button>
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

  return (
    <main className="auth-page setup-page">
      <Brand />
      <section className="auth-card setup-card">
        <header>
          <span className="setup-icon"><ShieldCheck size={22} /></span>
          <h1>Set up FastSchema</h1>
          <p>Create the first administrator account.</p>
        </header>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            const parsed = setupSchema.safeParse({ token, username, email, password })
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message || 'Check your details')
              return
            }
            setSubmitting(true)
            try {
              await apiRequest<boolean>('/setup', { method: 'POST', body: parsed.data })
              notify('FastSchema is ready. Log in to continue.', 'success')
              await navigate({ to: '/login' })
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : 'Setup failed')
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <label className="field">
            <span>Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@domain.ltd" autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
            <small>At least 8 characters</small>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button button-primary button-block" disabled={submitting}>
            {submitting ? <span className="spinner spinner-light" /> : <ArrowRight size={16} />}
            {submitting ? 'Creating administrator…' : 'Finish setup'}
          </button>
        </form>
      </section>
    </main>
  )
}
