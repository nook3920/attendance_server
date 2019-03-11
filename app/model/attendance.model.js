const mongoose = require('mongoose')
const User = require('./user.model')
const Schema = mongoose.Schema
const Classroom = require('../model/classroom.model')

const AttendanceSchema = mongoose.Schema({
  classroomid: {
    type: Schema.Types.ObjectId,
    ref: 'Classroom'
  },
  studentid: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: Number,
    trim: true
  },
  picture: {
    type: String,
    trim: true
  },
  date: Date
})
module.exports = mongoose.model('Attendance', AttendanceSchema)