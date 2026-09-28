const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  emoji: { type: String, required: true },
  color: { type: String, required: true },
  monthlyBudget: { type: Number, required: true },
})

module.exports = mongoose.model('Category', categorySchema)
