const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb')
const { getMissingParameters } = require('../utils/utils')
const crypto = require("crypto")

exports.get = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            userID: 'userID'
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

        const { userID } = req.body;

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(400).send({
                success: false,
                type: 'UserNotFound'
            })
        }

        let buildings = []
        if(user.role === "customer") {
            buildings = await req.buildings.find({userID}).toArray()
        }
        if(user.role === "worker") {
            buildings = await req.buildings.find({members: userID}).toArray()
        }

        res.status(200).send({
            success: true,
            data: buildings,
        })

    } catch (error) {
        console.log(error.message)
    }

}

exports.delete = (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            userID: 'userID',
            buildingID: 'buildingID'
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

        const { userID, buildingID } = req.body;

        req.buildings.deleteOne({userID, _id: ObjectId(buildingID)}, function(err, obj) {
            if(err) return res.status(500).send({success: false})
        })

        res.status(200).send({
            success: true,
            type: 'BuildingDeleted'
        })

    } catch (error) {
        console.log(error.message)
    }

}

exports.getUsers = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            buildingID: 'buildingID'
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

        const { buildingID } = req.body;

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
            userID: 'userID',
            buildingName: 'buildingName',
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

        const { userID, buildingName } = req.body;

        const foundUser = await req.users.findOne({_id: ObjectId(userID)})
        if(!foundUser) {
            return res.status(401).send({
                success: false,
                type: 'NoMatchingUserID'
            })
        }

        const foundBuilding = await req.buildings.findOne({userID, buildingName})
        if(foundBuilding) {
            return res.status(400).send({
                success: false,
                type: 'BuildingNameOccupied'
            })
        }

        req.buildings.insertOne({userID, buildingName, members: [userID]})   
        
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
            userID: 'userID',
            buildingName: 'buildingName',
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

        const { buildingID, userID, buildingName } = req.body;

        var query = { userID, _id: ObjectId(buildingID) }
        const values = { $set: { buildingName } };

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
            userID: 'userID',
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

        const { buildingID, userID } = req.body

        const building = await req.buildings.findOne({_id: ObjectId(buildingID), userID})
        if(!building) {
            return res.status(400).send({
                success: false,
                type: 'CouldNotFindBuilding'
            })
        }

        const createdAt = new Date()
        const expireAfterSeconds = 604800
        const expireAfterMilliseconds = expireAfterSeconds * 1000
        const expireAt = new Date(createdAt.getTime() + expireAfterMilliseconds)

        const code = crypto.randomBytes(8).toString("hex").toUpperCase();

        req.codes.insertOne({buildingID, code, createdAt, expireAt})

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

        const { code, userID } = req.body

        const matchingCode = await req.codes.findOne({code})
        req.codes.findOneAndDelete({code})
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

        req.buildings.updateOne({_id: ObjectId(matchingCode.buildingID) }, { $push: { members: userID } })

        res.status(200).send({
            success: true,
            data: building
        })

    } catch(err) {
        console.log(err.message)
    }
}
