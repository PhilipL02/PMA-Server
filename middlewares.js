const jwt = require('jsonwebtoken')

exports.verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization
        let decodedToken = jwt.verify(token, process.env.JWT_SECRET)
        req.decodedToken = decodedToken
        next()
    } 
    catch(err) {
        res.status(401).send({
            success: false,
            type: 'InvalidToken'
        })
    }
}