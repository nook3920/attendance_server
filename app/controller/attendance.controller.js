const mongoose = require('mongoose')
const Attendance = require('../model/attendance.model')
const Classroom = require('../model/classroom.model')
const User = require('../model/user.model')
const days = { 0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday" }

function timeToMinutes(time) {
  const h = time.getHours()
  const m = time.getMinutes()
  const timeInMinutes = ((h * 60) + m)
  return timeInMinutes
}

function checkAttendStatus(now, start, end, late) {
  if(now >= start && now <= (start+late))
    return 1
  else if(now > (start+late) && now <= end)
    return 2
  else if(now < start)
    return 5
  else 
    return 3
}

exports.handleAtten = async (req, res) => {
  const student_id = req.body.user_id || ''
  const roomId = req.body.roomid
  const dateNow = new Date()

  try {


    let classroom = await Classroom.findOne({
      roomId: roomId,
      day: days[dateNow.getDay()]
    }).exec()

    if (!classroom) {
      res.send({ message: 'no class room' })
    }
    console.log(classroom)
    console.log(classroom.day)
    if (days[dateNow.getDay()] !== classroom.day) {
      res.send({ message: 'day not correct' })
    }

    let std = await User.findOne({ user_id: student_id, role: 'STUDENT' }).exec()
    if (!std) {
      res.send({ 'message': 'no student in db' })
    }
    if (classroom.students.indexOf(std._id) === -1) {
      res.send({ message: `${std.name}::not student in class` })
    }

    let toDay = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate())
    let nextDay = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + 1)
    // console.log(std._id)
    let atDate = await Attendance.findOne({ studentid: std._id, date: { $gte: toDay, $lt: nextDay } }).exec()
    // console.log(atDate)
    if (atDate) {
      return res.send({ message: `${std.name}::already attendance` })
    }

    const timeNow = timeToMinutes(dateNow)
    const startTime = timeToMinutes(classroom.start)
    const endTime = timeToMinutes(classroom.end)

    const status = checkAttendStatus(timeNow, startTime, endTime, classroom.late)
    if (status === 5)
      res.send({ message: 'class not start yet' })


    const newAttend = new Attendance({
      classroomid: classroom._id,
      studentid: std._id,
      status: status,
      picture: 'hello',
      date: dateNow
    })

    let att = await newAttend.save()
    console.log(att)
    payload = {
      message: `${std.name}::attendance success`
    }
    res.send(payload)
  } catch (err) {
    console.error(err)
  }
}

exports.showAttend = async (req, res) => {
  let att = await Attendance.find({}).populate({
    path: 'studentid',
    select: 'name'
  }).populate({
    path: 'classroomid',
    select: 'subject'
  })

  res.send(att)
}

module.exports = function (io) {
  return {
    showAttend: async (req, res) => {
      let att = await Attendance.find({}).populate({
        path: 'studentid',
        select: 'name'
      }).populate({
        path: 'classroomid',
        select: 'subject'
      })

      res.send(att)
    },
    handleAtten: async (req, res) => {
      const student_id = req.body.user_id || ''
      const roomId = req.body.roomid
      const dateNow = new Date()

      try {
        let classroom = await Classroom.findOne({
          roomId: roomId,
          day: days[dateNow.getDay()]
        }).exec()

        if (!classroom) {
          res.send({ message: 'no class room' })
        }
        console.log(classroom)
        console.log(classroom.day)
        if (days[dateNow.getDay()] !== classroom.day) {
          res.send({ message: 'day not correct' })
        }

        let std = await User.findOne({ user_id: student_id, role: 'STUDENT' }).exec()
        if (!std) {
          res.send({ 'message': 'no student in db' })
        }
        if (classroom.students.indexOf(std._id) === -1) {
          res.send({ message: `${std.name}::not student in class` })
        }

        let toDay = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate())
        let nextDay = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + 1)
        // console.log(std._id)
        let atDate = await Attendance.findOne({ studentid: std._id, date: { $gte: toDay, $lt: nextDay } }).exec()
        // console.log(atDate)
        if (atDate) {
          return res.send({ message: `${std.name}::already attendance` })
        }

        const timeNow = timeToMinutes(dateNow)
        const startTime = timeToMinutes(classroom.start)
        const endTime = timeToMinutes(classroom.end)

        const status = checkAttendStatus(timeNow, startTime, endTime, classroom.late)
        if (status === 5)
          res.send({ message: 'class not start yet' })


        const newAttend = new Attendance({
          classroomid: classroom._id,
          studentid: std._id,
          status: status,
          picture: 'hello',
          date: dateNow
        })

        let att = await newAttend.save()
        console.log(att)
        payload = {
          message: `${std.name}::attendance success`
        }
        res.send(payload)
      } catch (err) {
        console.error(err)
      }
    }
  }
}