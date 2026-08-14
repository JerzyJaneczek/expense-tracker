import { useState, useEffect } from 'react'
import Stats from './components/Stats.jsx'
import ExpenseForm from './components/ExpenseForm.jsx'
import ExpenseHistory from './components/ExpenseHistory.jsx'
import './App.css'

export default function App() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/expenses')
      .then(r => r.json())
      .then(data => {
        setExpenses(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Could not connect to server. Make sure the server is running.')
        setLoading(false)
      })
  }, [])

  async function handleAdd(expense) {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Failed to save expense')
    }
    const saved = await res.json()
    setExpenses(prev => [saved, ...prev])
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete expense')
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="app">
      <div className="brand">TALLY</div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="loading">loading...</div>
      ) : (
        <>
          <Stats expenses={expenses} />
          <ExpenseForm onAdd={handleAdd} />
          <ExpenseHistory expenses={expenses} onDelete={handleDelete} />
        </>
      )}
    </div>
  )
}
