const express = require('express')
const expenseController = require('../controllers/expenseController')
const { auth } = require('../middleware/auth')

const router = express.Router()

router.use(auth)
router.get('/', expenseController.list)
router.post('/', expenseController.create)
router.delete('/:id', expenseController.remove)

module.exports = router
