const router = require('express').Router();
const buildings = require('../controllers/buildings');
const { verifyToken } = require("../middlewares")

router.post('/get', verifyToken, buildings.get)
router.get('/getone', verifyToken, buildings.getOneByID)
router.post('/delete', verifyToken, buildings.delete)
router.post('/users/get', verifyToken, buildings.getUsers)
router.post('/create', verifyToken, buildings.create)
router.post('/update', verifyToken, buildings.update)
router.post('/invite/create', verifyToken, buildings.createInvite)
router.post('/find', buildings.find)
router.post('/join', buildings.join)

module.exports = router
