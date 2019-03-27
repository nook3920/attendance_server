const verifySignUp = require('../middleware/verifySignUp')
const verifyToken = require('../middleware/verifyToken')
module.exports = (app, io) => {
  const userController = require('../controller/user.controller')
  const classroomController = require('../controller/classroom.controller')
  const AttendanceController = require('../controller/attendance.controller')(io)
  app.post('/user', [verifySignUp.checkDuplicateUserIdOrEmail],userController.signup)
  app.post('/user/login', userController.signin)
  app.get('/user/verify', verifyToken, userController.validateToken)
  app.post('/user/avatar',verifyToken, userController.uploadAvatar)
  app.get('/user/avatar', verifyToken, userController.getAvatar)
  app.post('/user/picture', verifyToken, userController.uploadPicture)
  app.get('/user/picture', verifyToken, userController.getPicture)
  app.delete('/user/picture', verifyToken, userController.deletePicture)

  app.get('/class', classroomController.classroomList)
  app.post('/class', verifyToken, classroomController.createClass)
  app.get('/class/student',  userController.getStudents)
  app.get('/class/:id', classroomController.getClassById)

  app.post('/attend', AttendanceController.handleAtten)
  app.get('/attend', AttendanceController.showAttend)
}