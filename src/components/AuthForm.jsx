import { useState } from 'react'

import './AuthForm.css'

export default function AuthForm({ mode = 'login', onSubmit }) {
  const isSignup = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { name: name.trim(), email: email.trim(), password }
    if (onSubmit) onSubmit(payload)
  }

  return (
    <div className="auth-container app-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2 className="auth-title">{isSignup ? 'Create account' : 'Welcome back'}</h2>
        {isSignup && (
          <label className="auth-label">
            <span>Name</span>
            <input
              value={name}
              name='name'
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </label>
        )}

        <label className="auth-label">
          <span>Email</span>
          <input
            type="email"
            value={email}
            name= "email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="auth-label">
          <span>Password</span>
          <input
            type="password"
            value={password}
            name ="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        <button className="auth-button" type="submit">
          {isSignup ? 'Sign up' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
