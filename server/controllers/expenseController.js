const mongoose = require('mongoose')
const Category = require('../models/categoryModel')
const Expense = require('../models/expenseModel')

function money(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return null
  return Math.round(amount * 100) / 100
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function presentExpense(expense) {
  return {
    id: expense._id.toString(),
    amount: expense.amount,
    categoryId: expense.categoryId.toString(),
    note: expense.note,
    date: expense.date,
    createdAt: expense.createdAt.getTime(),
  }
}

async function list(req, res) {
  const expenses = await Expense.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(expenses.map(presentExpense))
}

async function create(req, res) {
  const amount = money(req.body.amount)
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 40) : ''
  if (amount == null) return res.status(400).json({ message: 'add an amount above 0.' })
  if (!isDate(req.body.date)) return res.status(400).json({ message: 'pick a date.' })
  if (!mongoose.isValidObjectId(req.body.categoryId)) return res.status(400).json({ message: 'pick a category first.' })

  const category = await Category.findOne({ _id: req.body.categoryId, userId: req.userId })
  if (!category) return res.status(400).json({ message: 'pick a category first.' })

  const expense = await Expense.create({
    userId: req.userId,
    categoryId: category._id,
    amount,
    note,
    date: req.body.date,
  })
  res.status(201).json(presentExpense(expense))
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'spend not found.' })
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!expense) return res.status(404).json({ message: 'spend not found.' })
  res.json({ ok: true })
}

module.exports = { list, create, remove }
