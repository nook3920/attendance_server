const mongoose = require('mongoose')
const Attendance = require('../model/attendance.model')
const Classroom = require('../model/classroom.model')

exports.handleAtten = async (req, res) => {
  let classId = '5c8163f9bbbfc232a09147ac'
  let classroom = await Classroom.findOne({roomId: '413'}).exec()
  
  const newAttend = new Attendance({
    classroomid: classroom._id,
    studentid: mongoose.SchemaType.ObjectId(req.body.studentid),
    status: 1,
    picture: 'hello',
    date: new Date
  })

  let att = await newAttend.save()

  res.send(att)
}

