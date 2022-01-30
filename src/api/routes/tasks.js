const router = require('express').Router();
const tasks = require('../controllers/tasks');
const { verifyToken } = require('../middlewares/verifyToken')

router.get('/get', verifyToken, tasks.get)
router.get('/user/get', verifyToken, tasks.getUserTasks)
router.post('/create', verifyToken, tasks.create)
router.post('/take', verifyToken, tasks.take)
router.post('/completed/is', verifyToken, tasks.isCompleted)
router.post('/completed/not', verifyToken, tasks.notCompleted)
router.post('/worker/remove', verifyToken, tasks.removeFromTask)
router.post('/leave', verifyToken, tasks.leave)
router.post('/delete', verifyToken, tasks.delete)

module.exports = router
