import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

app.get('/api/expenses', async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.post('/api/expenses', async (req, res) => {
  const { amount, category, title, notes, date } = req.body

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' })
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([{ amount, category, title: title || null, notes: notes || null, date }])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
