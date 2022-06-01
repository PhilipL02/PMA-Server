const router = require('express').Router();
const buildings = require('../controllers/buildings');
const { verifyToken } = require('../middlewares/verifyToken')

router.get('/get', verifyToken, buildings.get)
router.get('/get/all', verifyToken, buildings.getAll)
router.post('/delete/:id', verifyToken, buildings.delete)
//När byggnad tas bort måste alla uppgifter i huset tas bort
router.get('/users/get/:id', verifyToken, buildings.getUsers)
router.post('/create', verifyToken, buildings.create)
router.post('/update', verifyToken, buildings.update)
router.post('/invite/create', verifyToken, buildings.createInvite)
router.post('/find', buildings.find)
router.post('/join', verifyToken, buildings.join)

module.exports = router
