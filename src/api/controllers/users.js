const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const { getMissingParameters, getRandomHexCode } = require('../../utils/utils')

function createToken(payload) {
    let token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
    return token
}

exports.get = (req, res) => {
    req.users.find().toArray(function(err, result) {
        if(err) console.log(err)
        if(result) 
        res.status(200).send({
            success: true,
            data: result,
        })
    });
}

exports.getCustomers = (req, res) => {
    req.users.find({role: "customer"}).toArray(function(err, result) {
        if(err) console.log(err)
        if(result) 
        res.status(200).send({
            success: true,
            data: result,
        })
    });
}

exports.signIn = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            email: 'email',
            password: 'password',
            // role: 'role',
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

        const { email, password, role } = req.body

        const user = await req.users.findOne({email})
        if(!user) {
            return res.status(400).send({
                success: false,
                type: 'BadCredentials',
            })
        }

        bcrypt.compare(password, user.password, async function(err, result) {
            if (err) {
                console.log(err.message)
                return res.status(400).send({
                    success: false, 
                    type: 'BadCredentials',
                });
            }
            if (result) {
                let token = createToken({userID: user._id, email: user.email, name: user.name, role: user.role})
                return res.status(200).send({
                    success: true, 
                    data: {
                        user: {
                            name: user.name,
                            email: user.email,
                            userID: user._id,
                            role: user.role,
                        },
                        token
                    }
                });
            } else {
                return res.status(400).send({
                    success: false, 
                    type: 'BadCredentials'
                });
            }
        })

    } catch (error) {
        console.log(error)
        res.status(400).send({
            success: false,
            type: 'BadCredentials'
        })
    }
}

exports.create = async (req, res) => {
    try{
        const EXPECTED_PARAMETERS = {
            firstName: 'firstName',
            lastName: 'lastName',
            email: 'email',
            password: 'password',
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

        const { firstName, lastName, email, password, code } = req.body;
        const name = `${firstName} ${lastName}`

        const foundCode = await req.codes.findOne({code})
        if(!foundCode) {
            return res.status(400).send({
                success: false,
                type: 'InvalidCode'
            })
        }

        const foundUser = await req.users.findOne({email})
        if(foundUser) {
            return res.status(400).send({
                success: false,
                type: 'EmailOccupied'
            })
        }

        if(email.length < 3)
        return res.status(400).send({
            success: false,
            type: 'InvalidEmail'
        })

        const buildingID = foundCode.buildingID
        const role = foundCode.role
        if(role !== 'customer') {
            if(!buildingID) {
                return res.status(400).send({
                    success: false,
                    type: 'InvalidCode'
                })
            }
        }

        bcrypt.hash(password, 10, (err, hash) => {
            if(err) {
                return res.status(500).send({
                    success: false
                })
            }
            const user = {firstName, lastName, name, email, password: hash, role}
            console.log(user)
            req.users.insertOne(user, function(err) {
                if (err) return;
                req.codes.findOneAndDelete({code: foundCode.code})
                if(role !== 'customer') {
                    let userID = (user._id).toString(); // this will return the id of object inserted
                    req.buildings.updateOne({_id: ObjectId(buildingID)}, { $push: { members: userID } })
                }
            })
        });

        res.status(200).send({
            success: true,
            type: 'UserCreated'
        })

    } catch(err) {
        console.log(err)
    }
}

exports.delete = async (req, res) => {
    try {

        const EXPECTED_PARAMETERS = {
            userID: 'userID',
            password: 'password'
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

        const { password, userID } = req.body
        const adminUserID = req.decodedToken.userID

        const adminUser = await req.users.findOne({_id: ObjectId(adminUserID)})
        if(adminUser.role !== "admin") {
            return res.status(403).send({
                success: false,
                type: "NotPermission"
            })
        }

        bcrypt.compare(password, adminUser.password, async function(err, result) {
            if(err) {
                console.log(err.message)
                return res.status(500).send({
                    success: false
                })
            }
            if(result) {
                const result = await req.users.deleteOne({ _id: ObjectId(userID) })
                console.log(result)
                if(result?.deletedCount) {
                    deleteAllDataConnectedToDeletedUser(req, userID)
                    return res.status(200).send({
                        success: true,
                        type: "UserDeleted"
                    })
                }
                else {
                    return res.status(400).send({
                        success: false,
                        type: "UserNotFound"
                    })
                }
            }
            else {
                return res.status(400).send({
                    success: false,
                })
            }
        });

    } catch (err) {
        console.log(err)
        res.status(400).send({
            success: false
        })
    }
}


async function deleteAllDataConnectedToDeletedUser(req, userID) {
        
    // Delete user from members-array in buildings
    const result1 = await req.buildings.updateMany({members: userID}, { $pull: { members: userID } })
    console.log(result1)

    // Set tasks assigned to user back to idle
    const result2 = await req.tasks.updateOne({assignedToUser: userID}, { $set: { assignedToUser: null, status: 'idle', approxCost: null, approxTime: null, comment: null } })
    console.log(result2)

    // Delete buildings that the user owns
    const buildings = await req.buildings.find({userID}).toArray()
    const result3 = await req.buildings.deleteMany({userID})
    console.log(result3)

    // Remove tasks connected to buildings that were deleted
    const buildingIDs = buildings.map(b => b._id.toString())
    const result4 = await req.tasks.deleteMany({buildingID: { $in: buildingIDs }})
    console.log(result4)

}   



exports.newToken = async (req, res) => {
    try{
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
                type: 'UserNotFound',
            })
        }

        let token = createToken({userID: user._id, email: user.email, name: user.name, role: user.role})
        res.status(200).send({
            success: true, 
            data: {
                user: {
                    name: user.name,
                    email: user.email,
                    userID: user._id,
                    role: user.role,
                },
                token
            }
        });

    } catch(err) {
        console.log(err)
    }
}

exports.getDetails = async (req, res) => {
    try {
        const { userID } = req.decodedToken

        const user = await req.users.findOne({_id: ObjectId(userID)})
        if(!user) {
            return res.status(400).send({
                success: false
            })
        }

        const {firstName, lastName, name, email} = user
        const userDetails = {firstName, lastName, name, email}

        res.status(200).send({
            success: true, 
            data: {
                userDetails
            }
        })
    } catch (err) {
        console.log(err.message)
    }
}

exports.updateDetails = async (req, res) => {
    try {

        const { firstName, lastName, email } = req.body.userDetails
        const { userID } = req.decodedToken

        const userWithMatchingEmail = await req.users.findOne({email})
        if(userWithMatchingEmail && !(userWithMatchingEmail._id.equals(userID))) {
            return res.status(400).send({
                success: false,
                type: 'EmailOccupied'
            })
        }

        const name = `${firstName} ${lastName}`

        req.users.updateOne({_id: ObjectId(userID)}, { $set: { firstName, lastName, name, email } }, (err, obj) => {
            if(obj.matchedCount === 1) {
                return res.status(200).send({
                    success: true, 
                })
            }
            else res.status(400).send({
                success: false    
            })
        })

    } catch (err) {
        console.log(err.message)
        res.status(400).send({
            success: false
        })
    }
}

exports.createCustomerCode = async (req, res) => {
    try {
        
        const { email } = req.body;

        const code = await sendCodeByEmail(email)

        if(code) {
            req.codes.insertOne({code, role: 'customer'})
            return res.status(200).send({
                success: true,
                data: {
                    code
                }
            })
        }
        else {
            res.status(400).send({
                success: false
            })
        }

    } catch (err) {
        console.log(err)
        res.status(400).send({
            success: false,
        })
    }
}


const nodemailer = require("nodemailer");

async function sendCodeByEmail(email) {
    try {   

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASS
            }
        });
        let code = getRandomHexCode();

        let info = await transporter.sendMail({
            to: email,
            subject: "Login", 
            html: `
                <h2>Här är din kod för att skapa ett konto hos PHUS</h2>
                ${code}
            `,
        });
        return code;

    } catch (err) {
        console.log(err)
        return false
    }
}
