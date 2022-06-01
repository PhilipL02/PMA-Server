const crypto = require('crypto');

exports.getMissingParameters = (parameters, data) => {
    return Object.keys(parameters).filter(k => !data[k]?.length && k)
}

exports.getRandomHexCode = () => {
    const code = crypto.randomBytes(8).toString("hex").toUpperCase();
    return code;
}
