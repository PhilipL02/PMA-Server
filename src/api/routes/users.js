const router = require('express').Router();
const users = require('../controllers/users');

router.post('/get', users.get)
router.post('/create', users.create)
router.post('/signIn', users.signIn)
router.post('/token/new', users.newToken)

module.exports = router
