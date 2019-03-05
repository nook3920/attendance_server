const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const config = require('../config/config')
const User = require('../model/user.model')
const fs = require('fs')


exports.signup = async (req, res) => {
  console.log('User Signup')
  const user = new User({
    user_id: req.body.user_id,
    email: req.body.email,
    name: req.body.name,
    gender: req.body.gender,
    password: bcrypt.hashSync(req.body.password, 8),
    role: req.body.role
  })

  try {
    let newUser = await user.save()
    res.status(201).send({
      message: 'User is created'
    })
    return
  } catch (err) {
    res.boom.badImplementation('DB ERROR')
    return
  }
}

exports.signin = async (req, res) => {
  if (!req.body.user_id || !req.body.password) {
    res.boom.badRequest('invalid query')
    return
  }

  User.findOne({ user_id: req.body.user_id })
    .exec((err, user) => {
      if (err) {
        res.boom.badImplementation('DB ERROR')
        return
      }
      if(!user){
        res.boom.badRequest('wrong user')
        return
      }
      var passIsValid = bcrypt.compareSync(req.body.password, user.password)
      if (!passIsValid) {
        res.boom.badRequest('wrong password')
        return
      }

      const payload = {
        _id: user._id,
        user_id: user.user_id,
        role: user.role,
        email: user.email,
        name: user.name,
        gender: user.gender,
        avatar: user.avatar || ''
      }

      var token = jwt.sign(payload, config.secret, {
        expiresIn: 86400
      })
      res.status(200).send({
        auth: true,
        accessToken: token,
        user: payload
      })
    })
}

exports.validateToken = (req, res) => {
  let token = req.headers.authorization.split(' ')[1] || ''
  jwt.verify(token, config.secret, (err, decoded) => {
    if(err) {
      res.boom.unauthorized('token expired')
      return
    }
    res.status(200).send(decoded)
    return
  })
}

exports.uploadAvatar = (req, res) => {
  let avatarData = req.body.dataUrl.split(',')[1]
  let fileName = req.user.user_id + '.jpg'
  fs.writeFile(`./avatar/${fileName}`, avatarData, 'base64', function(err) {
    console.log(err)
  })

  User.findByIdAndUpdate(req.user._id,
    {avatar: fileName},
    {new: true},
    (err, ress) => {
      if(err){
        res.boom.badImplementation('DB ERROR')
        return
      }
      
      return res.status(200).send(ress)
    })
}

exports.getAvatar = (req, res) => {
  let img = {
    a: 'data:img/png;base64,'+ fs.readFileSync(`./avatar/${req.user.user_id}.jpg`, 'base64')
  }
  
  return res.send(img)
  User.findById(req.user._id, (err, user) => {
    if(err) {
      res.boom.badImplementation('DB ERROR')
      return
    }
    if(!user.avatar){
      req.user.avatar = 'blank.png'
    }
    return res.send(user.avatar)
  })
}