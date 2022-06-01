const { ObjectId } = require('mongodb')
const { getMissingParameters, getRandomHexCode } = require('../../utils/utils')

exports.get = async (req, res) => {
    try {

        const { userID } = req.decodedToken 

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(400).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        const ownedBuildings = await req.buildings.find({userID}).toArray()
        const buildings = await req.buildings.find({members: userID}).toArray()

        res.status(200).send({
            success: true,
            data: {
                ownedBuildings,
                buildings,
            }
        })

    } catch (error) {
        console.log(error.message)
    }

}

exports.getAll = (req, res) => {
    req.buildings.find().toArray(function(err, result) {
        if(err) console.log(err)
        if(result) 
        res.status(200).send({
            success: true,
            data: result,
        })
    });
}

// exports.getOneByID = async (req, res) => {
//     try {
//
//     } catch (error) {
//         console.log(error.message)
//     }
// }

exports.delete = (req, res) => {
    try {
        
        const { id } = req.params
        const { userID } = req.decodedToken

        req.buildings.deleteOne({userID, _id: ObjectId(id)}, function(err, obj) {
            if(err) return res.status(500).send({success: false})
            if(obj.deletedCount === 1) {
                req.tasks.deleteMany({buildingID: id})
                return res.status(200).send({
                    success: true,
                    type: 'BuildingDeleted'
                })
            }
            else res.status(400).send({
                success: false
            })
        })

    } catch (error) {
        console.log(error.message)
    }

}

exports.getUsers = async (req, res) => {
    try {

        const buildingID = req.params.id;

        const building = await req.buildings.findOne({_id: ObjectId(buildingID)})

        const users = building.members?.map(u => ObjectId(u)) || []

        req.users.find({_id: { $in: users }}).project({ password: 0 }).toArray(function(err, result) {
            if(err) return console.log(err)
            if(result) 
            res.status(200).send({
                success: true,
                data: {
                    members: result,
                },
            })
        });

    } catch (error) {
        console.log(error.message)
    }
}

exports.create = async (req, res) => {
    try{
        const EXPECTED_PARAMETERS = {
            buildingName: 'buildingName',
            type: 'type',
            description: 'description',
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

        const { buildingName, type, description, address, place, zipCode } = req.body;
        const { userID } = req.decodedToken;

        const foundUser = await req.users.findOne({_id: ObjectId(userID)})
        if(!foundUser) {
            return res.status(401).send({
                success: false,
                type: 'NoMatchingUserID'
            })
        }

        if(foundUser.role !== 'customer') {
            return res.status(400).send({
                success: false,
                type: 'NotPermission'
            })
        }

        const foundBuilding = await req.buildings.findOne({userID, buildingName})
        if(foundBuilding) {
            return res.status(400).send({
                success: false,
                type: 'BuildingNameOccupied'
            })
        }

        const date = new Date();

        req.buildings.insertOne({userID, buildingName, type, description, address, place, zipCode, createdAt: date, members: [userID]})   
        
        res.status(200).send({
            success: true,
            type: 'BuildingAdded'
        })

    } catch(err) {
        console.log(err)
    }
}

exports.update = async (req, res) => {
    try{
        const EXPECTED_PARAMETERS = {
            buildingID: 'buildingID',
            buildingName: 'buildingName',
            type: 'type',
            description: 'description',
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

        const { buildingID, buildingName, type, description, address, place, zipCode } = req.body;
        const { userID } = req.decodedToken

        var query = { userID, _id: ObjectId(buildingID) }
        const values = { $set: { buildingName, type, description, address, place, zipCode } };

        const foundUser = await req.users.findOne({_id: ObjectId(userID)})
        if(!foundUser) {
            return res.status(401).send({
                success: false,
                type: 'NoMatchingUserID'
            })
        }

        const foundBuilding = await req.buildings.findOne({userID, buildingName, _id: { $ne: ObjectId(buildingID) }})
        if(foundBuilding) {
            return res.status(400).send({
                success: false,
                type: 'BuildingNameOccupied'
            })
        }

        req.buildings.updateOne(query, values, function(err, result) {
            if(err) {
                console.log(err)
                res.status(400).send({
                    success: false,
                })
            }
            res.status(200).send({
                success: true,
                type: 'BuildingUpdated'
            })
        })   
        


    } catch(err) {
        console.log(err)
    }
}

exports.createInvite = async (req, res) => {
    try{
        const EXPECTED_PARAMETERS = {
            buildingID: 'buildingID',
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

        const { buildingID } = req.body
        const { userID } = req.decodedToken

        const building = await req.buildings.findOne({_id: ObjectId(buildingID), userID})
        if(!building) {
            return res.status(400).send({
                success: false,
                type: 'CouldNotFindBuilding'
            })
        }

        const activeCodesForBuilding = await req.codes.find({buildingID: buildingID}).sort({ createdAt: 1 }).toArray()
        if(activeCodesForBuilding.length >= 10) await req.codes.deleteOne(activeCodesForBuilding[0])

        const createdAt = new Date()
        const expireAfterSeconds = 604800
        const expireAfterMilliseconds = expireAfterSeconds * 1000
        const expireAt = new Date(createdAt.getTime() + expireAfterMilliseconds)

        const code = getRandomHexCode();

        req.codes.insertOne({buildingID, code, role: 'worker', createdAt, expireAt})

        res.status(200).send({
            success: true,
            data: {
                code
            }
        })

    } catch(err) {
        res.status(400).send({
            success: false,
            type: 'BadBuildingID'
        })
    }
}

exports.find = async (req, res) => {
    try{
        const EXPECTED_PARAMETERS = {
            code: 'code',
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

        const { code } = req.body

        const matchingCode = await req.codes.findOne({code})
        if(!matchingCode) {
            return res.status(400).send({
                success: false,
                type: 'CodeInvalid'
            })
        }

        const building = await req.buildings.findOne({_id: ObjectId(matchingCode.buildingID)})
        if(!building) {
            return res.status(400).send({
                success: false,
                type: 'BuildingNotFound'
            })
        }

        res.status(200).send({
            success: true,
            data: building,
        })

    } catch(err) {
        console.log(err.message)
    }
}

exports.join = async (req, res) => {
    try{
        const EXPECTED_PARAMETERS = {
            code: 'code',
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

        const { code } = req.body
        const { userID } = req.decodedToken

        const matchingCode = await req.codes.findOne({code})
        if(!matchingCode) {
            return res.status(400).send({
                success: false,
                type: 'CodeInvalid'
            })
        }

        const building = await req.buildings.findOne({_id: ObjectId(matchingCode.buildingID)})
        if(!building) {
            return res.status(400).send({
                success: false,
                type: 'BuildingNotFound'
            })
        }

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(401).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        if(building.members.find(id => id === userID)) {
            return res.status(200).send({
                success: true,
                type: 'UserAlreadyMember',
                message: 'User is already member of house'
            })
        }

        req.codes.findOneAndDelete({code})
        req.buildings.updateOne({_id: ObjectId(matchingCode.buildingID) }, { $push: { members: userID } })

        res.status(200).send({
            success: true,
            data: building
        })

    } catch(err) {
        console.log(err.message)
    }
}
