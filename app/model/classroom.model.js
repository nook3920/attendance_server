const mongoose = require('mongoose')
const User = require('./user.model')
const Schema = mongoose.Schema

const ClassroomSchema = mongoose.Schema({
  subject: {
    type: String,
    trim: true
  },
  start: Number,
  end: Number,
  late: Number,
  date: String,
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  attendance: [{
    type: Schema.Types.ObjectId,
    ref: 'Attendance'
  }],
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
})

module.exports = mongoose.model('Classroom', ClassroomSchema)