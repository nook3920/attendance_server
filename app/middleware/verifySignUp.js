const User = require('../model/user.model')

checkDuplicateUserIdOrEmail = (req, res, next) => {
  console.log('check user1')
  if (!req.body.user_id ||
    !req.body.password ||
    !req.body.email ||
    !req.body.gender ||
    !req.body.name ||
    !req.body.role) {
      res.boom.badRequest('invalid query')
      return 
  }
  User.findOne({ user_id: req.body.user_id })
  .exec((err, user_id) => {
    console.log(err)
    // if(err & err.kind !== 'ObjectId'){
    //   res.boom.badImplementation('mongoose error')
    //   return
    // }
    if(user_id){
      res.boom.conflict('User Id already taken!')
      return
    }
    User.findOne({ email: req.body.email })
    .exec((err, email) => {
      // if(err & err.kind !== 'ObjectId'){
      //   res.boom.badImplementation('mongoose error')
      //   return
      // }
      if(email){
        res.boom.conflict('email already taken!')
        return
      }
    })
    next()
  })
}

const signUpVerify = {}
signUpVerify.checkDuplicateUserIdOrEmail = checkDuplicateUserIdOrEmail

module.exports = signUpVerify