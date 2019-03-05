const jwt = require('jsonwebtoken')
const config = require('../config/config')

verifyToken = (req, res, next) => {
  let token = req.headers['authorization'] || ''

  if (!token) {
    res.boom.unauthorized('login please')
    return
  }
  token = token.split(' ')[1]
  
  
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      res.boom.unauthorized('token expired')
      return
    }
    req.user = decoded
    next()
  })
}

module.exports = verifyToken