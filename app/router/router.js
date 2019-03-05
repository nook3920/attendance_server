const verifySignUp = require('../middleware/verifySignUp')
const verifyToken = require('../middleware/verifyToken')
module.exports = (app) => {
  const userController = require('../controller/user.controller')
  const classroomController = require('../controller/classroom.controller')
  app.post('/user', [verifySignUp.checkDuplicateUserIdOrEmail],userController.signup)
  app.post('/user/login', userController.signin)
  app.get('/user/verify', userController.validateToken)
  app.post('/user/avatar',verifyToken, userController.uploadAvatar)
  app.get('/user/avatar', verifyToken, userController.getAvatar)

  app.get('/class', classroomController.classroomList)
}