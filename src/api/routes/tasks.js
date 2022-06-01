const router = require('express').Router();
const tasks = require('../controllers/tasks');
const { verifyToken } = require('../middlewares/verifyToken')

router.get('/get/:id', verifyToken, tasks.get)
router.get('/get/idle/all', verifyToken, tasks.getAllIdle)
router.get('/user/get', verifyToken, tasks.getUserTasks)
router.get('/user/get', verifyToken, tasks.getUserTasks)
router.get('/owner/get', verifyToken, tasks.getOwnerTasks)
router.post('/create', verifyToken, tasks.create)
router.post('/update', verifyToken, tasks.update)
router.post('/take', verifyToken, tasks.take)
router.post('/assigned/accept', verifyToken, tasks.take)
router.post('/assigned/decline', verifyToken, tasks.declineAssigned)
router.post('/comment/add', verifyToken, tasks.addComment)
router.post('/comment/remove', verifyToken, tasks.removeComment)
router.post('/completed/is', verifyToken, tasks.isCompleted)
router.post('/completed/not', verifyToken, tasks.notCompleted)
router.post('/worker/remove', verifyToken, tasks.removeFromTask)
router.post('/leave', verifyToken, tasks.leave)
router.post('/delete', verifyToken, tasks.delete)

module.exports = router
