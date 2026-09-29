import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api, getToken, setToken, type User } from './api'
import HomePage from './HomePage'
import {
  formatDay,
  formatMoney,
  monthLeft,
  shiftISO,
  todayISO,
  type Category,
  type Expense,
} from './data'

type Tab = 'today' | 'month' | 'categories'

const TOUR_STEPS: { tab: Tab; title: string; text: string }[] = [
  {
    tab: 'today',
    title: 'Spent today',
    text: 'This is the total for the day you are looking at. It stays at ₹0 until you record a spend.',
  },
  {
    tab: 'today',
    title: 'The date',
    text: 'The date starts as today. Use the arrows or the calendar to look at another day.',
  },
  {
    tab: 'categories',
    title: 'Add a category',
    text: 'Name what you spend on and set the amount for this month. Categories are created only on this page.',
  },
  {
    tab: 'today',
    title: 'The list',
    text: 'The category shows here. Click it, enter the amount and details, then save. What is left for the month goes down.',
  },
]

function tourKey(userId: string) {
  return `expense-tracker.tour.${userId}`
}

function TourOverlay({
  step,
  onSkip,
  onNext,
}: {
  step: number
  onSkip: () => void
  onNext: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; left: number } | null>(null)
  const current = TOUR_STEPS[step]

  useLayoutEffect(() => {
    const target = document.querySelector('.tour-target')
    target?.scrollIntoView({ block: 'center', inline: 'nearest' })

    function place() {
      const node = document.querySelector('.tour-target')
      const card = cardRef.current
      if (!node || !card) return
      const rect = node.getBoundingClientRect()
      const width = card.offsetWidth
      const height = card.offsetHeight
      const gap = 12
      const margin = 16
      let top = rect.bottom + gap
      if (top + height > window.innerHeight - margin) {
        const above = rect.top - gap - height
        top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - height)
      }
      let left = rect.left
      if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width
      if (left < margin) left = margin
      setBox((current) => (current && current.top === top && current.left === left ? current : { top, left }))
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [step])

  if (!current) return null

  return (
    <div className="tour" role="dialog" aria-labelledby="tour-title">
      <div className="tour-shade" />
      <div
        ref={cardRef}
        className="tour-card"
        style={box ? { top: box.top, left: box.left } : undefined}
      >
        <p className="kicker">
          {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="tour-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="tour-actions">
          <button type="button" className="text-btn" onClick={onSkip}>
            Skip
          </button>
          <button type="button" className="primary" onClick={onNext}>
            {step === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

function statusLine(total: number) {
  if (total === 0) return 'No spending recorded for this day.'
  return 'Spending recorded for this day.'
}

function AuthScreen({
  onDone,
  startMode,
  onBack,
}: {
  onDone: (user: User) => void
  startMode: 'join' | 'login'
  onBack: () => void
}) {
  const [mode, setMode] = useState<'join' | 'login'>(startMode)
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const confirming = mode === 'join' && step === 'otp'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (confirming) {
        const data = await api<{ token: string; user: User }>('/api/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ email, otp }),
        })
        setToken(data.token)
        onDone(data.user)
        return
      }
      const path = mode === 'join' ? '/api/auth/register' : '/api/auth/login'
      const data = await api<{ token?: string; user?: User; otpRequired?: boolean }>(path, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (data.otpRequired) {
        setStep('otp')
        setOtp('')
        return
      }
      if (!data.token || !data.user) throw new Error('something went wrong.')
      setToken(data.token)
      onDone(data.user)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setBusy(true)
    setError('')
    try {
      await api('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <button type="button" className="brand" onClick={onBack} aria-label="Home">
          <span className="brand-mark">BT</span>
        </button>
        <h2>BudgetTracker</h2>
        <p>Record daily spending, set a monthly amount for each category, and see what is left.</p>
      </aside>
      <form className="auth-card" onSubmit={submit}>
        <p className="kicker">BudgetTracker</p>
        <h1>{confirming ? 'Check your email' : mode === 'join' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mood-line">
          {confirming
            ? `We sent a 6-digit code to ${email}. Enter it to confirm this inbox is yours.`
            : mode === 'join'
              ? 'Use your email. We send a code before the account is created.'
              : 'Log in with your email and password.'}
        </p>
        {confirming ? (
          <label>
            code
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
        ) : (
          <>
            <label>
              email
              <input
                autoFocus
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {confirming ? 'Confirm email' : mode === 'join' ? 'Send code' : 'Log in'}
        </button>
        {confirming ? (
          <button type="button" className="text-btn" disabled={busy} onClick={resend}>
            resend code
          </button>
        ) : (
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setMode(mode === 'join' ? 'login' : 'join')
              setStep('details')
              setError('')
            }}
          >
            {mode === 'join' ? 'Already have an account? Log in' : 'New here? Sign up'}
          </button>
        )}
        <button type="button" className="text-btn" onClick={onBack}>
          Back to the site
        </button>
      </form>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [boot, setBoot] = useState<'loading' | 'guest' | 'ready'>('loading')
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [tab, setTab] = useState<Tab>('today')
  const [day, setDay] = useState(todayISO)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [gate, setGate] = useState<'home' | 'join' | 'login'>('home')
  const [showHome, setShowHome] = useState(false)
  const [tourStep, setTourStep] = useState<number | null>(null)

  useEffect(() => {
    document.title = user?.email ? `BudgetTracker · ${user.email}` : 'BudgetTracker'
  }, [user])

  useEffect(() => {
    if (!getToken()) {
      setBoot('guest')
      return
    }
    api<User>('/api/auth/me')
      .then(async (me) => {
        const [nextCategories, nextExpenses] = await Promise.all([
          api<Category[]>('/api/categories'),
          api<Expense[]>('/api/expenses'),
        ])
        setUser(me)
        setCategories(nextCategories)
        setExpenses(nextExpenses)
        setBoot('ready')
      })
      .catch(() => {
        setToken(null)
        setBoot('guest')
      })
  }, [])

  useEffect(() => {
    if (boot !== 'ready' || !user || categories.length > 0) return
    if (localStorage.getItem(tourKey(user.id))) return
    setTourStep(0)
    setTab('today')
  }, [boot, user, categories.length])

  useEffect(() => {
    if (tourStep !== 3 || categories.length === 0) return
    setSelectedCategoryId(categories[0].id)
  }, [tourStep, categories])

  function finishTour() {
    if (user) localStorage.setItem(tourKey(user.id), 'done')
    setTourStep(null)
    setTab('today')
  }

  function nextTour() {
    if (tourStep === null) return
    const next = tourStep + 1
    if (next >= TOUR_STEPS.length) {
      finishTour()
      return
    }
    setTab(TOUR_STEPS[next].tab)
    setTourStep(next)
  }

  const today = todayISO()
  const monthKey = today.slice(0, 7)
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const dayExpenses = expenses
    .filter((expense) => expense.date === day && categoryMap.has(expense.categoryId))
    .sort((a, b) => b.createdAt - a.createdAt)
  const dayGroups: { categoryId: string; expenses: Expense[] }[] = []
  for (const expense of dayExpenses) {
    const group = dayGroups.find((item) => item.categoryId === expense.categoryId)
    if (group) group.expenses.push(expense)
    else dayGroups.push({ categoryId: expense.categoryId, expenses: [expense] })
  }
  const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const line = statusLine(dayTotal)

  const monthExpenses = expenses.filter(
    (expense) => expense.date.startsWith(monthKey) && categoryMap.has(expense.categoryId),
  )
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const byCategory = categories
    .map((category) => ({
      category,
      total: monthExpenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
  const removedTotal = monthExpenses
    .filter((expense) => !categoryMap.has(expense.categoryId))
    .reduce((sum, expense) => sum + expense.amount, 0)

  function spentIn(categoryId: string, month: string) {
    return expenses
      .filter((expense) => expense.categoryId === categoryId && expense.date.startsWith(month))
      .reduce((sum, expense) => sum + expense.amount, 0)
  }

  function leftFor(category: Category, month = monthKey) {
    return monthLeft(category.monthlyBudget, spentIn(category.id, month))
  }

  function openCategory(id: string) {
    setFormError('')
    if (selectedCategoryId === id) {
      setSelectedCategoryId(null)
      return
    }
    setAmount('')
    setNote('')
    setSelectedCategoryId(id)
  }

  async function addExpense(event: FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!selectedCategoryId) return
    if (!day) {
      setFormError('pick a date.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setFormError('add an amount above 0.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const expense = await api<Expense>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amount: value,
          categoryId: selectedCategoryId,
          note: note.trim(),
          date: day,
        }),
      })
      setExpenses((current) => [expense, ...current])
      setAmount('')
      setNote('')
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function removeExpense(id: string) {
    setExpenses((current) => current.filter((expense) => expense.id !== id))
    try {
      await api(`/api/expenses/${id}`, { method: 'DELETE' })
    } catch (caught) {
      const nextExpenses = await api<Expense[]>('/api/expenses')
      setExpenses(nextExpenses)
      setFormError(caught instanceof Error ? caught.message : 'something went wrong.')
    }
  }

  async function addCategory(event?: FormEvent) {
    event?.preventDefault()
    const name = newName.trim()
    const monthlyBudget = Number(newBudget)
    if (!name) {
      setCategoryError('give it a name, like grocery.')
      return
    }
    if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
      setCategoryError('add how much this category gets this month.')
      return
    }
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError('that category already exists.')
      return
    }
    setSaving(true)
    setCategoryError('')
    try {
      const category = await api<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          emoji: '',
          color: '#16324f',
          monthlyBudget,
        }),
      })
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setNewBudget('')
      setTab('today')
    } catch (caught) {
      setCategoryError(caught instanceof Error ? caught.message : 'something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(id: string) {
    setCategories((current) => current.filter((category) => category.id !== id))
    setExpenses((current) => current.filter((expense) => expense.categoryId !== id))
    setSelectedCategoryId((current) => (current === id ? null : current))
    setPendingDelete(null)
    try {
      await api(`/api/categories/${id}`, { method: 'DELETE' })
    } catch (caught) {
      const [nextCategories, nextExpenses] = await Promise.all([
        api<Category[]>('/api/categories'),
        api<Expense[]>('/api/expenses'),
      ])
      setCategories(nextCategories)
      setExpenses(nextExpenses)
      setCategoryError(caught instanceof Error ? caught.message : 'something went wrong.')
    }
  }

  async function updateBudget(id: string, value: string) {
    const monthlyBudget = Number(value)
    if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) return
    try {
      const updated = await api<Category>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ monthlyBudget }),
      })
      setCategories((current) => current.map((category) => (category.id === id ? updated : category)))
    } catch (caught) {
      setCategoryError(caught instanceof Error ? caught.message : 'something went wrong.')
    }
  }

  function logout() {
    setToken(null)
    setUser(null)
    setCategories([])
    setExpenses([])
    setBoot('guest')
    setGate('home')
    setShowHome(false)
  }

  const dayLabel = day === today ? 'Today' : formatDay(day)

  const pageTitle = tab === 'categories' ? 'Add category' : tab === 'month' ? 'This month' : dayLabel
  const pageLine =
    tab === 'categories'
      ? 'Create a category here. It shows on Today with the amount left this month.'
      : tab === 'month'
        ? `${formatMoney(monthTotal)} spent so far.`
        : line

  if (boot === 'loading') {
    return (
      <div className="auth-screen">
        <p className="mood-line">Loading your account…</p>
      </div>
    )
  }

  if (showHome) {
    return (
      <HomePage
        signedIn={Boolean(user)}
        onJoin={() => {
          setShowHome(false)
          if (!user) setGate('join')
        }}
        onLogin={() => {
          setShowHome(false)
          setGate('login')
        }}
      />
    )
  }

  if (!user) {
    if (gate === 'home') {
      return <HomePage onJoin={() => setGate('join')} onLogin={() => setGate('login')} />
    }
    return (
      <AuthScreen
        startMode={gate}
        onBack={() => setGate('home')}
        onDone={async (next) => {
          const [nextCategories, nextExpenses] = await Promise.all([
            api<Category[]>('/api/categories'),
            api<Expense[]>('/api/expenses'),
          ])
          setUser(next)
          setCategories(nextCategories)
          setExpenses(nextExpenses)
          setBoot('ready')
        }}
      />
    )
  }

  return (
    <div className="site">
      <header className="site-header">
        <div className="wrap header-inner">
          <button type="button" className="brand" onClick={() => setShowHome(true)} aria-label="Home">
            <span className="brand-mark">BT</span>
            <div>
              <strong>BudgetTracker</strong>
              <span>{user.email}</span>
            </div>
          </button>
          <nav className="nav" aria-label="Site">
            {(
              [
                ['today', 'Today'],
                ['month', 'This month'],
                ['categories', 'Add category'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <button type="button" className="ghost logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <section className="page-hero">
            <div>
              <p className="kicker">Overview</p>
              <h1>{pageTitle}</h1>
              <p className="mood-line">{pageLine}</p>
            </div>
          </section>

          {tab === 'today' && (
            <div className="today-layout">
              <div className="today-toolbar">
                <section className={tourStep === 0 ? 'summary tour-target' : 'summary'}>
                  <div>
                    <p className="label">Spent today</p>
                    <p className="total">{formatMoney(dayTotal)}</p>
                  </div>
                </section>
                <div className={tourStep === 1 ? 'day-switch tour-target' : 'day-switch'}>
                  <button type="button" onClick={() => setDay(shiftISO(day, -1))} aria-label="Previous day">
                    ‹
                  </button>
                  <input
                    type="date"
                    max={today}
                    value={day}
                    aria-label={formatDay(day)}
                    onChange={(event) => {
                      const next = event.target.value
                      setDay(next && next <= today ? next : today)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setDay(shiftISO(day, 1))}
                    disabled={day >= today}
                    aria-label="Next day"
                  >
                    ›
                  </button>
                </div>
              </div>

              <section className={tourStep === 3 ? 'panel tour-target' : 'panel'}>
                {categories.length === 0 ? (
                  <p className="empty">No categories yet. Add one from Add category.</p>
                ) : (
                  <>
                    <div className="list-head">
                      <span>Category</span>
                      <span>Remaining</span>
                      <span>Monthly amount</span>
                    </div>
                    <ul className="spend-list">
                      {categories.map((category) => {
                        const open = selectedCategoryId === category.id
                        const details = dayGroups.find((group) => group.categoryId === category.id)?.expenses ?? []
                        return (
                          <li key={category.id} className={open ? 'open' : ''}>
                            <button type="button" className="spend-category" onClick={() => openCategory(category.id)}>
                              <strong>{category.name}</strong>
                              <span>{leftFor(category, day.slice(0, 7))}</span>
                              <span className="budget-figure">{formatMoney(category.monthlyBudget)}</span>
                            </button>
                            {open && (
                              <>
                                {details.length === 0 ? (
                                  <p className="empty inner-empty">Nothing recorded in this category for this day.</p>
                                ) : (
                                  <ul className="spend-details">
                                    {details.map((expense) => (
                                      <li key={expense.id}>
                                        <span>{expense.note || 'No details'}</span>
                                        <span className="spend-amount">{formatMoney(expense.amount)}</span>
                                        <button type="button" className="ghost" onClick={() => removeExpense(expense.id)}>
                                          Remove
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <form className="spend-entry" onSubmit={addExpense}>
                                  <label>
                                    Amount
                                    <input
                                      inputMode="decimal"
                                      placeholder="240"
                                      value={amount}
                                      onChange={(event) => setAmount(event.target.value)}
                                    />
                                  </label>
                                  <label>
                                    Details
                                    <input
                                      placeholder="What you bought"
                                      value={note}
                                      maxLength={40}
                                      onChange={(event) => setNote(event.target.value)}
                                    />
                                  </label>
                                  {formError && <p className="error">{formError}</p>}
                                  <button type="submit" className="primary" disabled={saving}>
                                    Save
                                  </button>
                                </form>
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>
            </div>
          )}

          {tab === 'month' && (
            <section className="panel month-panel">
              <section className="summary">
                <div>
                  <p className="label">This month</p>
                  <p className="total">{formatMoney(monthTotal)}</p>
                </div>
                <p className="pill">{monthExpenses.length} spends</p>
              </section>
              {monthExpenses.length === 0 ? (
                <p className="empty">No spending recorded this month.</p>
              ) : (
                <ul className="bars">
                {byCategory.map(({ category, total }) => (
                  <li key={category.id}>
                    <div className="bar-meta">
                      <span>{category.name}</span>
                      <strong>{formatMoney(total)}</strong>
                    </div>
                    <p className="hint left-note">{leftFor(category)} of {formatMoney(category.monthlyBudget)}</p>
                    <div className="track">
                      <span
                        style={{
                          width: `${Math.max(8, (total / monthTotal) * 100)}%`,
                          background: category.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
                {removedTotal > 0 && (
                  <li>
                    <div className="bar-meta">
                      <span>Removed categories</span>
                      <strong>{formatMoney(removedTotal)}</strong>
                    </div>
                  </li>
                )}
                </ul>
              )}
            </section>
          )}

          {tab === 'categories' && (
            <div className="split">
              <div>
                {categories.length === 0 ? (
                  <p className="empty">No categories yet. Add one with the form.</p>
                ) : (
                  <ul className="cat-list">
                    {categories.map((category) => {
                      const confirming = pendingDelete === category.id
                      return (
                        <li key={category.id}>
                          <span className="spend-copy">
                            <strong>{category.name}</strong>
                            <small>
                              {leftFor(category)} of {formatMoney(category.monthlyBudget)}
                            </small>
                          </span>
                          <label className="budget-edit">
                            this month
                            <input
                              key={`${category.id}-${category.monthlyBudget}`}
                              type="number"
                              min="1"
                              defaultValue={category.monthlyBudget}
                              onBlur={(event) => updateBudget(category.id, event.target.value)}
                            />
                          </label>
                          {confirming ? (
                            <span className="confirm">
                              <button type="button" className="danger" onClick={() => deleteCategory(category.id)}>
                                Delete
                              </button>
                              <button type="button" className="ghost" onClick={() => setPendingDelete(null)}>
                                Keep
                              </button>
                            </span>
                          ) : (
                            <button type="button" className="ghost" onClick={() => setPendingDelete(category.id)}>
                              Delete
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              <form className={tourStep === 2 ? 'panel category-form tour-target' : 'panel category-form'} onSubmit={addCategory}>
              <h2>Add category</h2>
              <label>
                Name
                <input
                  value={newName}
                  maxLength={20}
                  placeholder="Grocery"
                  onChange={(event) => {
                    setNewName(event.target.value)
                    setCategoryError('')
                  }}
                />
              </label>
              <label>
                Monthly amount
                <input
                  inputMode="decimal"
                  placeholder="2000"
                  value={newBudget}
                  onChange={(event) => setNewBudget(event.target.value)}
                />
              </label>
              {categoryError && <p className="error">{categoryError}</p>}
              <button type="submit" className="primary" disabled={saving}>
                Add category
              </button>
              <p className="hint">Each spend reduces what is left this month. Next month starts from the full amount.</p>
            </form>
            </div>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="wrap">saved in your account.</div>
      </footer>
      {tourStep !== null && (
        <TourOverlay step={tourStep} onSkip={finishTour} onNext={nextTour} />
      )}
    </div>
  )
}

export default App
