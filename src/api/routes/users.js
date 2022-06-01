const router = require('express').Router();
const users = require('../controllers/users');
const { verifyToken } = require('../middlewares/verifyToken')

router.get('/get', users.get)
router.get('/customers/get', users.getCustomers)
router.post('/create', users.create)
router.post('/signIn', users.signIn)
router.post('/delete', verifyToken, users.delete)
router.post('/token/new', users.newToken)
router.get('/details/get', verifyToken, users.getDetails)
router.post('/details/update', verifyToken, users.updateDetails)
router.post('/code/create', verifyToken, users.createCustomerCode)


module.exports = router
