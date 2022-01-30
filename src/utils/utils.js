exports.getMissingParameters = (parameters, data) => {
    return Object.keys(parameters).filter(k => !data[k]?.length && k)
}