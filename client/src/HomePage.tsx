type HomePageProps = {
  onJoin: () => void
  onLogin: () => void
}

const steps = [
  {
    number: '01',
    title: 'Add a category',
    text: 'Name what you spend on and set the amount for this month.',
  },
  {
    number: '02',
    title: 'Open it on Today',
    text: 'Click the category, then enter the amount and a short detail.',
  },
  {
    number: '03',
    title: 'See what is left',
    text: 'Each spend lowers the remaining amount. Next month starts full again.',
  },
]

export default function HomePage({ onJoin, onLogin }: HomePageProps) {
  return (
    <div className="site">
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">ET</span>
            <strong>Expense Tracker</strong>
          </a>
          <nav className="nav" aria-label="Site">
            <a href="#how">How it works</a>
            <a href="#preview">The list</a>
            <button type="button" onClick={onLogin}>
              Log in
            </button>
          </nav>
          <button type="button" className="primary home-cta" onClick={onJoin}>
            Create account
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="kicker">Daily spending</p>
              <h1>See what is left in each category this month.</h1>
              <p className="hero-lead">
                Expense Tracker keeps a monthly amount for every category. When you record a spend, that amount
                goes down. The date starts as today, and you can change it.
              </p>
              <div className="hero-actions">
                <button type="button" className="primary" onClick={onJoin}>
                  Create account
                </button>
                <button type="button" className="ghost home-secondary" onClick={onLogin}>
                  Log in
                </button>
              </div>
            </div>
            <div className="hero-card" aria-hidden="true">
              <p className="label">Spent today</p>
              <p className="total">₹100</p>
              <div className="hero-row">
                <strong>Grocery</strong>
                <span>₹1,900 left</span>
                <span>₹2,000</span>
              </div>
              <div className="hero-row muted">
                <strong>Travel</strong>
                <span>₹1,234 left</span>
                <span>₹1,234</span>
              </div>
            </div>
          </div>
        </section>

        <section className="home-section" id="how">
          <div className="wrap">
            <p className="kicker">How it works</p>
            <h2>Three steps, then the list is yours.</h2>
            <ol className="steps">
              {steps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="home-section alt" id="preview">
          <div className="wrap preview-grid">
            <div>
              <p className="kicker">On Today</p>
              <h2>Categories stay in a list. Details open when you click.</h2>
              <p className="hero-lead">
                The category name is the row. Remaining and the monthly amount sit beside it. Click the row to see
                what you already added, then record another amount.
              </p>
            </div>
            <div className="panel preview-panel">
              <div className="list-head">
                <span>Category</span>
                <span>Remaining</span>
                <span>Monthly amount</span>
              </div>
              <div className="hero-row">
                <strong>Grocery</strong>
                <span>₹1,900 left</span>
                <span>₹2,000</span>
              </div>
              <p className="preview-detail">Milk · ₹100</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <span>Expense Tracker</span>
          <button type="button" className="text-btn" onClick={onJoin}>
            Create account
          </button>
        </div>
      </footer>
    </div>
  )
}
