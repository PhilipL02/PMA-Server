const { ObjectId } = require('mongodb')
const { getMissingParameters } = require('../utils/utils')

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
        
        const { buildingID, taskName, priority } = req.body;

        const foundBuilding = await req.buildings.findOne({_id: ObjectId(buildingID)})
        if(!foundBuilding) {
            return res.status(401).send({
                success: false,
                type: 'NoMatchingBuildingID'
            })
        }

        const foundTask = await req.tasks.findOne({buildingID, taskName})
        if(foundTask) {
            return res.status(400).send({
                success: false,
                type: 'TaskNameOccupied'
            })
        }

        req.tasks.insertOne({buildingID, taskName, priority, status: 'idle'})   
        
        res.status(200).send({
            success: true,
            type: 'TaskAdded'
        })

    } catch (error) {
        console.log(error.message)
    }
}

exports.get = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            buildingID: 'buildingID',
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

        const { buildingID, userID } = req.body;

        const isMember = !!await req.buildings.findOne({_id: ObjectId(buildingID), members: userID })
        const isOwner = !!await req.buildings.findOne({_id: ObjectId(buildingID), userID })
        if(!isMember && !isOwner) {
            return res.status(400).send({
                success: false,
                type: 'NotMember'
            })
        }

        req.tasks.find({buildingID}).toArray(function (err, result) {
            if(err) return console.log(err)
            if(result) 
            res.status(200).send({
                success: true,
                data: {
                    tasks: result,
                },
            })
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
            userID: 'userID',
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

        const { taskID, userID, approxCost, approxTime, comment } = req.body;

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
            userID: 'userID',
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
        
        const { buildingID, userID, taskID } = req.body;

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

