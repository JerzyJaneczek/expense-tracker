import { useState } from 'react'
import { CATEGORIES } from './ExpenseForm.jsx'

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const LONG_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  return SHORT_MONTHS[m - 1] + ' ' + d
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7)
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return LONG_MONTHS[m - 1] + ' ' + y
}

export default function ExpenseHistory({ expenses, onDelete }) {
  const [deleteError, setDeleteError] = useState(null)

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        No expenses yet. Add one above to get started.
      </div>
    )
  }

  const groups = {}
  for (const e of expenses) {
    const key = monthKey(e.date)
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }

  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  async function handleDelete(id) {
    setDeleteError(null)
    try {
      await onDelete(id)
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete.')
      setTimeout(() => setDeleteError(null), 3000)
    }
  }

  return (
    <div className="history-section">
      {deleteError && <div className="error-banner">{deleteError}</div>}
      {sortedKeys.map(key => {
        const items = groups[key].slice().sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        )
        const total = items.reduce((s, e) => s + Number(e.amount), 0)

        return (
          <div key={key} className="month-group">
            <div className="month-header">
              <span className="month-label">{monthLabel(key)}</span>
              <span className="month-total">{fmt(total)}</span>
            </div>
            {items.map(expense => {
              const cat = CATEGORIES[expense.category] || CATEGORIES.other
              const displayTitle = expense.title || cat.name
              const meta = [cat.name, expense.notes].filter(Boolean).join(' · ')

              return (
                <div key={expense.id} className="expense-item">
                  <div
                    className="expense-cat-icon"
                    style={{ '--cat-color': cat.color }}
                  >
                    {cat.emoji}
                  </div>
                  <div className="expense-info">
                    <div className="expense-title">{displayTitle}</div>
                    <div className="expense-meta">{meta}</div>
                  </div>
                  <div className="expense-right">
                    <div className="expense-right-text">
                      <div className="expense-amount">{fmt(expense.amount)}</div>
                      <div className="expense-date">{formatDate(expense.date)}</div>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(expense.id)}
                      aria-label="Delete expense"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
