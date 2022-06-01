const { ObjectId } = require('mongodb')
const { getMissingParameters } = require('../../utils/utils')

exports.create = async (req, res) => {

    try {
        const EXPECTED_PARAMETERS = {
            buildingID: 'buildingID',
            taskName: 'taskName',
            priority: 'priority',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }
        
        const { buildingID, taskName, priority, assignedToUser } = req.body;
        const { userID } = req.decodedToken
        let status = 'idle'

        const foundBuilding = await req.buildings.findOne({_id: ObjectId(buildingID)})
        if(!foundBuilding) {
            return res.status(401).send({
                success: false,
                type: 'NoMatchingBuildingID'
            })
        }

        const userAllowedToCreate = !!await req.buildings.findOne({_id: ObjectId(buildingID), userID})
        if(!userAllowedToCreate) {
            return res.status(400).send({
                success: false,
                type: 'UserNotAllowedToCreate'
            })
        }

        const foundTask = await req.tasks.findOne({buildingID, taskName})
        if(foundTask) {
            return res.status(400).send({
                success: false,
                type: 'TaskNameOccupied'
            })
        }

        const createdAt = new Date()
        if(assignedToUser) status = 'assigned'

        req.tasks.insertOne({buildingID, taskName, priority, status, assignedToUser, createdAt , comments: []})   
        
        res.status(200).send({
            success: true,
            type: 'TaskAdded'
        })

    } catch (error) {
        console.log(error.message)
    }
}

exports.update = async (req, res) => {

    try {
        const EXPECTED_PARAMETERS = {
            buildingID: 'buildingID',
            taskID: 'taskID',
            taskName: 'taskName',
            priority: 'priority',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }
        
        const { buildingID, taskID, taskName, priority } = req.body;
        const { userID } = req.decodedToken

        const foundBuilding = await req.buildings.findOne({_id: ObjectId(buildingID)})
        if(!foundBuilding) {
            return res.status(401).send({
                success: false,
                type: 'NoMatchingBuildingID'
            })
        }

        const userAllowedToUpdate = !!await req.buildings.findOne({_id: ObjectId(buildingID), userID})
        if(!userAllowedToUpdate) {
            return res.status(400).send({
                success: false,
                type: 'UserNotAllowedToUpdate'
            })
        }

        const foundTask = await req.tasks.findOne({buildingID, taskName, _id: { $ne: ObjectId(taskID)}})
        if(foundTask) {
            return res.status(400).send({
                success: false,
                type: 'TaskNameOccupied'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $set: { taskName, priority }})   
        
        res.status(200).send({
            success: true,
            type: 'TaskUpdated'
        })

    } catch (error) {
        console.log(error.message)
    }
}

exports.get = async (req, res) => {
    try {
        
        const buildingID = req.params.id
        const { userID } = req.decodedToken

        const isMember = !!await req.buildings.findOne({_id: ObjectId(buildingID), members: userID })
        const isOwner = !!await req.buildings.findOne({_id: ObjectId(buildingID), userID })
        if(!isMember && !isOwner) {
            return res.status(400).send({
                success: false,
                type: 'NotMember'
            })
        }

        const tasks = await req.tasks.find({buildingID}).toArray()

        res.status(200).send({
            success: true,
            data: {
                tasks: tasks,
            },
        })

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}


exports.getAllIdle = async (req, res) => {
    try {
        
        const { userID } = req.decodedToken

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(400).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        const buildings = await req.buildings.find({members: userID}).toArray()

        const idleTasks = []
        for(let i = 0; i < buildings.length; i++) {
            const taskForBuilding = await req.tasks.find({buildingID: (buildings[i]._id).toString()}).toArray()
            const idleTasksForBuilding = taskForBuilding.filter(task => task.status === 'idle')
            idleTasks.push(...idleTasksForBuilding)
        }

        res.status(200).send({
            success: true,
            data: {
                idleTasks
            }
        })


    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.getUserTasks = async (req, res) => {
    try {
        
        const { userID } = req.decodedToken

        const tasks = await req.tasks.find({assignedToUser: userID}).toArray()

        res.status(200).send({
            success: true,
            data: {
                tasks: tasks,
            },
        })

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.getOwnerTasks = async (req, res) => {
    try {
        
        const { userID } = req.decodedToken

        const ownedBuildings = await req.buildings.find({userID}).toArray()
        
        const tasks = []
        for(let i = 0; i < ownedBuildings.length; i++) {
            const taskForBuilding = await req.tasks.find({buildingID: (ownedBuildings[i]._id).toString()}).toArray()
            tasks.push(...taskForBuilding)
        }

        res.status(200).send({
            success: true,
            data: {
                tasks
            }
        })


    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.take = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
            // approxCost: 'approxCost',
            // approxTime: 'approxTime',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { userID } = req.decodedToken
        const { taskID, approxCost, approxTime, comment } = req.body;

        const task = await req.tasks.findOne({_id: ObjectId(taskID)})
        if(!task) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }


        const isMember = !!await req.buildings.findOne({_id: ObjectId(task.buildingID), members: userID })
        const isOwner = !!await req.buildings.findOne({_id: ObjectId(task.buildingID), userID })
        if(!isMember && !isOwner) {
            return res.status(400).send({
                success: false,
                type: 'NotMember'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $set: { assignedToUser: userID, status: 'inProgress', approxCost, approxTime, comment } })

        res.status(200).send({
            success: true,
            type: 'TakenOnTask'
        })
        

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.declineAssigned = async (req, res) => {

    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { userID } = req.decodedToken
        const { taskID } = req.body;

        const task = await req.tasks.findOne({_id: ObjectId(taskID)})
        if(!task) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }


        const isMember = !!await req.buildings.findOne({_id: ObjectId(task.buildingID), members: userID })
        const isOwner = !!await req.buildings.findOne({_id: ObjectId(task.buildingID), userID })
        if(!isMember && !isOwner) {
            return res.status(400).send({
                success: false,
                type: 'NotMember'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $set: { assignedToUser: undefined, status: 'idle' } })

        res.status(200).send({
            success: true,
            type: 'DeclinedAssignedTask'
        })
        

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}


exports.addComment = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { taskID, comment } = req.body;
        const { userID, name } = req.decodedToken

        const task = await req.tasks.findOne({_id: ObjectId(taskID)})
        if(!task) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        const commentObject = {userID, name, text: comment, id: userID+Date.now()}

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $push: { comments: commentObject } })

        res.status(200).send({
            success: true
        })

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.removeComment = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
            commentID: 'commentID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { taskID, commentID } = req.body;
        const { userID } = req.decodedToken

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $pull: { comments: { id: commentID } } })

        res.status(200).send({
            success: true
        })

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.removeFromTask = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
            userID: 'userID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { taskID, userID } = req.body;

        const task = await req.tasks.findOne({_id: ObjectId(taskID)})
        if(!task) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }
        
        const havePermission = !!await req.buildings.findOne({_id: ObjectId(task?.buildingID), userID})
        if(!havePermission) {
            return res.status(400).send({
                success: false,
                type: 'NotPermission'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $set: { assignedToUser: null, status: 'idle', approxCost: null, approxTime: null, comment: null } })

        res.status(200).send({
            success: true,
            type: 'UserRemovedFromTask'
        })
        

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.leave = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { taskID } = req.body;
        const { userID } = req.decodedToken;

        const task = await req.tasks.findOne({_id: ObjectId(taskID)})
        if(!task) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID), assignedToUser: userID}, { $set: { assignedToUser: null, status: 'idle', approxCost: null, approxTime: null, comment: null } })

        res.status(200).send({
            success: true,
            type: 'UserLeftTask'
        })
        

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}


exports.isCompleted = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { taskID } = req.body;
        const { userID } = req.decodedToken;

        const task = await req.tasks.findOne({_id: ObjectId(taskID)})
        if(!task) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        const building = await req.buildings.findOne({_id: ObjectId(task.buildingID)})
        if(!building) {
            return res.status(400).send({
                success: false,
            })
        }

        const permission = !!(await req.tasks.findOne({_id: ObjectId(taskID), assignedToUser: userID}) || await req.buildings.findOne({userID: userID}))
        if(!permission) {
            return res.status(400).send({
                success: false,
                type: 'NotPermission'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $set: { status: 'completed' } })

        res.status(200).send({
            success: true,
            type: 'TaskCompleted'
        })
        

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}


exports.notCompleted = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            taskID: 'taskID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }

        const { taskID } = req.body;
        const { userID } = req.decodedToken;

        const task = await req.tasks.findOne({_id: ObjectId(taskID)})
        if(!task) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        const building = await req.buildings.findOne({_id: ObjectId(task.buildingID)})
        if(!building) {
            return res.status(400).send({
                success: false,
            })
        }

        const permission = !!(await req.tasks.findOne({_id: ObjectId(taskID), assignedToUser: userID}) || await req.buildings.findOne({userID: userID}))
        if(!permission) {
            return res.status(400).send({
                success: false,
                type: 'NotPermission'
            })
        }

        req.tasks.updateOne({_id: ObjectId(taskID)}, { $set: { status: 'inProgress' } })

        res.status(200).send({
            success: true,
            type: 'TaskNotCompleted',
            message: 'Task no longer completed'
        })
        

    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            success: false
        })
    }
}


exports.delete = async (req, res) => {
    
    try {
        const EXPECTED_PARAMETERS = {
            buildingID: 'buildingID',
            taskID: 'taskID',
        }

        const missingParameters = getMissingParameters(EXPECTED_PARAMETERS, req.body)
        if(missingParameters.length) {
            return res.status(400).send({
                success: false,
                message: `Missing parameter(s): ${missingParameters}`,
                data: {
                    status: 400,
                    params: missingParameters
                }
            })
        }
        
        const { buildingID, taskID } = req.body;
        const { userID } = req.decodedToken;

        const foundBuilding = await req.buildings.findOne({_id: ObjectId(buildingID)})
        if(!foundBuilding) {
            return res.status(401).send({
                success: false,
                type: 'NoMatchingBuildingID'
            })
        }

        const userAllowedToDelete = !!await req.buildings.findOne({_id: ObjectId(buildingID), userID})
        if(!userAllowedToDelete) {
            return res.status(400).send({
                success: false,
                type: 'UserNotAllowedToDelete'
            })
        }

        const foundTask = await req.tasks.findOne({buildingID, _id: ObjectId(taskID)})
        if(!foundTask) {
            return res.status(400).send({
                success: false,
                type: 'TaskNotFound'
            })
        }

        req.tasks.deleteOne({_id: ObjectId(taskID)})   
        
        res.status(200).send({
            success: true,
            type: 'TaskDeleted'
        })

    } catch (error) {
        console.log(error.message)
    }
}

