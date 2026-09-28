const express = require('express')
const categoryController = require('../controllers/categoryController')
const { auth } = require('../middleware/auth')

const router = express.Router()

router.use(auth)
router.get('/', categoryController.list)
router.post('/', categoryController.create)
router.patch('/:id', categoryController.updateBudget)
router.delete('/:id', categoryController.remove)

module.exports = router
