const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const { getMissingParameters } = require('../utils/utils')

function createToken(payload) {
    let token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '600s'})
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

exports.signIn = async (req, res) => {
    try {
        const EXPECTED_PARAMETERS = {
            email: 'email',
            password: 'password',
            role: 'role',
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

        const user = await req.users.findOne({email, role})
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
            name: 'name',
            email: 'email',
            password: 'password',
            role: 'role',
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

        const { name, email, password, role } = req.body;

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

        if(role !== "customer" && role !== "worker")
        return res.status(400).send({
            success: false,
            type: 'InvalidRole',
            message: 'Role must be worker or customer'
        })

        bcrypt.hash(password, 10, (err, hash) => {
            if(err) {
                return res.status(500).send({
                    success: false
                })
            }
            const user = {name, email, password: hash, role}
            req.users.insertOne(user);
        });

        res.status(200).send({
            success: true,
            type: 'UserCreated'
        })

    } catch(err) {
        console.log(err)
    }
}
