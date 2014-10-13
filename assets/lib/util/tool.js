function getPixelValue(valueStr){
    return Number(valueStr.substr(0, valueStr.length-2));
}

module.exports = {
    getPixelValue: getPixelValue
};