import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { apiRequest, apiResults } from './api'

export default function AuthPage({ onAuthenticated }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [register, setRegister] = useState(new URLSearchParams(location.search).get('mode') === 'register')
  const [universities, setUniversities] = useState([])
  const [campuses, setCampuses] = useState([])
  const [university, setUniversity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!register) return
    apiRequest('/universities/').then((response) => setUniversities(apiResults(response))).catch((requestError) => setError(requestError.message))
  }, [register])

  useEffect(() => {
    if (!university) { setCampuses([]); return }
    apiRequest(`/campuses/?university=${university}`).then((response) => setCampuses(apiResults(response))).catch((requestError) => setError(requestError.message))
  }, [university])

  const switchMode = (isRegister) => {
    setRegister(isRegister)
    setError('')
    navigate(`/account?mode=${isRegister ? 'register' : 'login'}${location.search.includes('next=') ? `&${new URLSearchParams(location.search).toString().split('&').find((part) => part.startsWith('next='))}` : ''}`, { replace: true })
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const data = new FormData(event.currentTarget)
    try {
      if (register) {
        await apiRequest('/auth/register/', { method: 'POST', body: {
          full_name: data.get('full_name'),
          email: data.get('email'),
          password: data.get('password'),
          confirm_password: data.get('confirm_password'),
          university: Number(data.get('university')),
          campus: Number(data.get('campus')),
          student_id: data.get('student_id'),
        } })
      }
      const tokens = await apiRequest('/auth/login/', { method: 'POST', body: { email: data.get('email'), password: data.get('password') } })
      const profile = await apiRequest('/auth/me/', { token: tokens.access })
      onAuthenticated({ ...tokens, user: profile })
      const next = new URLSearchParams(location.search).get('next')
      navigate(next?.startsWith('/') ? next : '/browse', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return <main className="account-page"><section className="account-panel"><div className="eyebrow muted-eyebrow">{register ? 'JOIN YOUR CAMPUS' : 'WELCOME BACK'}</div><h1>{register ? <>Your people.<br /><em>Your marketplace.</em></> : <>Good to see<br /><em>you again.</em></>}</h1><p className="account-intro">{register ? 'Create a student account to list, save and message around campus.' : 'Sign in to pick up where you left off.'}</p><form className="account-form" onSubmit={submit}>
      {register && <label className="field-label">Full name<input name="full_name" autoComplete="name" required maxLength="160" placeholder="Your name" /></label>}
      <label className="field-label">Student email<input name="email" type="email" autoComplete="email" required placeholder="you@university.ac.ke" /></label>
      {register && <><div className="form-row"><label className="field-label">University<select name="university" required value={university} onChange={(event) => setUniversity(event.target.value)}><option value="">Choose university</option>{universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-label">Campus<select name="campus" required disabled={!university}><option value="">Choose campus</option>{campuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label className="field-label">Student ID<input name="student_id" required maxLength="80" placeholder="Your university ID" /></label></>}
      <label className="field-label">Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 10 : undefined} placeholder={register ? 'At least 10 characters' : 'Your password'} /></label>
      {register && <label className="field-label">Confirm password<input name="confirm_password" type="password" autoComplete="new-password" required minLength="10" placeholder="Enter it again" /></label>}
      {error && <p className="form-error account-error" role="alert">{error}</p>}
      <button className="dark-button account-submit" disabled={loading}>{loading ? 'Please wait...' : register ? 'Create student account' : 'Sign in'} <ArrowRight size={17} /></button>
    </form><p className="account-switch">{register ? 'Already part of the community?' : 'New around here?'} <button onClick={() => switchMode(!register)}>{register ? 'Sign in' : 'Create an account'}</button></p><div className="account-safety"><ShieldCheck size={16} />Student details stay private from other users.</div></section><aside className="account-aside"><span className="account-art-tag">CAMPUS MARKET / KENYA</span><img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=90" alt="Students talking together between classes" /><div><span>Make campus</span><strong>a little more connected.</strong></div></aside></main>
}
