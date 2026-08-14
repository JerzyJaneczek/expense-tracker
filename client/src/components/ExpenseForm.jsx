import { useState } from 'react'

export const CATEGORIES = {
  food:      { name: 'Food',      emoji: '🍔', color: '#A8412F' },
  transport: { name: 'Transport', emoji: '🚗', color: '#5C7A99' },
  shopping:  { name: 'Shopping', emoji: '🛍️', color: '#8C5A8C' },
  bills:     { name: 'Bills',     emoji: '💡', color: '#B9922E' },
  fun:       { name: 'Fun',       emoji: '🎬', color: '#33635F' },
  health:    { name: 'Health',    emoji: '❤️', color: '#A8412F' },
  home:      { name: 'Home',      emoji: '🏠', color: '#7A7F4E' },
  other:     { name: 'Other',     emoji: '📦', color: '#6B6F60' },
}

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function ExpenseForm({ onAdd }) {
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('other')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(todayISO())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setError('Please enter a valid amount.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onAdd({ amount: parsed, category, title: title.trim(), notes: notes.trim(), date })
      setAmount('')
      setTitle('')
      setNotes('')
      setCategory('other')
      setDate(todayISO())
    } catch (err) {
      setError(err.message || 'Failed to save expense.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-card">
      <div className="form-title">New Expense</div>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Title</label>
          <input
            type="text"
            maxLength={60}
            placeholder="What did you spend on?"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <span className="cat-label">Category</span>
          <div className="category-grid">
            {Object.entries(CATEGORIES).map(([id, cat]) => (
              <button
                key={id}
                type="button"
                className={`cat-chip${category === id ? ' selected' : ''}`}
                style={{ '--cat-color': cat.color }}
                onClick={() => setCategory(id)}
              >
                <span className="cat-emoji">{cat.emoji}</span>
                <small>{cat.name}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Notes</label>
          <textarea
            rows={2}
            maxLength={240}
            placeholder="Optional note..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-add" disabled={submitting}>
          {submitting ? 'SAVING...' : 'ADD EXPENSE'}
        </button>
        {error && <div className="form-error">{error}</div>}
      </form>
    </div>
  )
}
