const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const config = require('../config/config')
const User = require('../model/user.model')
const fs = require('fs')
const axios = require('axios')

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
      if (!user) {
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
        gender: user.gender,
        avatar: user.avatar || ''
      }

      var token = jwt.sign(payload, config.secret, {
        expiresIn: 86400
      })
      res.status(200).send({
        auth: true,
        accessToken: token,
        user: payload,
        name: user.name
      })
    })
}

exports.validateToken = (req, res) => {
  let token = req.headers.authorization.split(' ')[1] || ''
  jwt.verify(token, config.secret, async (err, decoded) => {
    if (err) {
      res.boom.unauthorized('token expired')
      return
    }
    // console.log(req.user)
    let userr = await User.findById(decoded._id).exec()

    res.status(200).send({
      userr
    })
    return
  })
}

exports.uploadAvatar = (req, res) => {
  let avatarData = req.body.dataUrl.split(',')[1]
  let fileName = req.user.user_id + '.jpg'
  fs.writeFile(`./avatar/${fileName}`, avatarData, 'base64', function (err) {
    console.log(err)
  })

  User.findByIdAndUpdate(req.user._id,
    { avatar: fileName },
    { new: true },
    (err, ress) => {
      if (err) {
        res.boom.badImplementation('DB ERROR')
        return
      }

      return res.status(200).send(ress)
    })
}

exports.getAvatar = (req, res) => {
  let img = {
    a: 'data:img/png;base64,' + fs.readFileSync(`./avatar/${req.user.user_id}.jpg`, 'base64')
  }

  return res.send(img)
  User.findById(req.user._id, (err, user) => {
    if (err) {
      res.boom.badImplementation('DB ERROR')
      return
    }
    if (!user.avatar) {
      req.user.avatar = 'blank.png'
    }
    return res.send(user.avatar)
  })
}

exports.getStudents = async (req, res) => {
  console.log('get studene list')
  try {
    const students = await User.find({ role: 'STUDENT' }, '_id name user_id')
    return res.send(students)
  } catch (err) {
    return res.boom.badImplementation('DB ERROR')
  }
}

exports.uploadPicture = (req, res) => {
  let dir = `./datasets/${req.user.user_id}`
  const filename = `${req.user.user_id}_${Date.now()}.jpg`
  let picData = req.body.pic.split(',')[1]

  // console.log(picData)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  fs.writeFileSync(`${dir}/${filename}`, picData, 'base64')

  User.update({ _id: req.user._id },
    { $push: { picture: filename } },
    { upsert: true },
    (err, q) => {
      if (err)
        console.log(err)
      console.log(q)
    })
  axios.get(`htpp://localhost:5000/train`)
    .then(ress => {
      console.log(ress.data)
    })
    .catch(err => {
      console.log(err)
    })
  const payload = {
    id: req.user.user_id,
    fileName: filename
  }
  console.log(payload)
  res.send(payload)
}

exports.getPicture = async (req, res) => {
  let userr = await User.findById(req.user._id).exec()
  res.send({
    id: req.user.user_id,
    picture: userr.picture
  })

}

exports.deletePicture = async (req, res) => {
  const user_id = req.user.user_id
  const picName = req.body.filename
  let userr = await User.update({ user_id: user_id },
    { $pull: { picture: picName } }).exec()
  console.log(userr)

  fs.unlinkSync(`./datasets/${user_id}/${picName}`)
  
  axios.get(`htpp://localhost:5000/delete?filename=${picName}`)
  .then(ress => {
    console.log(ress.data)
  })
  .catch(err => {
    console.log(err)
  })

  res.send(req.body)
}