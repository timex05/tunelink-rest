const bcrypt = require('bcryptjs');

async function encryptPassword(password){
    return await bcrypt.hash(password, 10);
}

async function comparePassword(encryptedPassword, password){
    return await bcrypt.compare(encryptedPassword, password);
}

module.exports = { 
    encryptPassword,
    comparePassword
 }