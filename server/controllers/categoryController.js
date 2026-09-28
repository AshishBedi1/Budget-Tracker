const mongoose = require('mongoose')
const Category = require('../models/categoryModel')
const Expense = require('../models/expenseModel')

function cleanName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 24) : ''
}

function money(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return null
  return Math.round(amount * 100) / 100
}

function presentCategory(category) {
  return {
    id: category._id.toString(),
    name: category.name,
    emoji: category.emoji,
    color: category.color,
    monthlyBudget: category.monthlyBudget,
  }
}

async function list(req, res) {
  const categories = await Category.find({ userId: req.userId }).sort({ name: 1 })
  res.json(categories.map(presentCategory))
}

async function create(req, res) {
  const name = cleanName(req.body.name)
  const monthlyBudget = money(req.body.monthlyBudget)
  const emoji = typeof req.body.emoji === 'string' && req.body.emoji.trim() ? req.body.emoji.trim().slice(0, 8) : '🧾'
  const color = typeof req.body.color === 'string' ? req.body.color : '#f4a7b9'
  if (!name) return res.status(400).json({ message: 'give the category a name.' })
  if (monthlyBudget == null) return res.status(400).json({ message: 'add how much this category gets this month.' })

  const taken = await Category.findOne({
    userId: req.userId,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  })
  if (taken) return res.status(409).json({ message: 'that category already exists.' })

  const category = await Category.create({
    userId: req.userId,
    name,
    emoji,
    color,
    monthlyBudget,
  })
  res.status(201).json(presentCategory(category))
}

async function updateBudget(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'category not found.' })
  const monthlyBudget = money(req.body.monthlyBudget)
  if (monthlyBudget == null) return res.status(400).json({ message: 'add how much this category gets this month.' })
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { monthlyBudget },
    { new: true },
  )
  if (!category) return res.status(404).json({ message: 'category not found.' })
  res.json(presentCategory(category))
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'category not found.' })
  const category = await Category.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!category) return res.status(404).json({ message: 'category not found.' })
  await Expense.deleteMany({ userId: req.userId, categoryId: category._id })
  res.json({ ok: true })
}

module.exports = { list, create, updateBudget, remove }
