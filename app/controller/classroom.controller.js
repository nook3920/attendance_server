const Classroom = require('../model/classroom.model')

exports.classroomList = async (req, res) => {
  console.log('classroom list')
  try {
    const classrooms = await Classroom.find({}).populate({
      path: 'teacher',
      select: 'name'
    })
    return res.send(classrooms)
  } catch (err) {
    return res.boom.badImplementation('DB ERROR')
  }
  res.send('ok')
}