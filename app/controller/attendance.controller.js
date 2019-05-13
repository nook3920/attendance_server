const mongoose = require('mongoose')
const Attendance = require('../model/attendance.model')
const Classroom = require('../model/classroom.model')
const User = require('../model/user.model')
const days = { 0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday" }
const fs = require('fs')
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cpe.facedetection@gmail.com', // your email
    pass: 'Project1234' // your email password
  }
});

async function sendMail(sendTo, className, stuName, status, picture) {

  const state = (status === 1) ? '✔' : '🕔'
  const subject = `สวัสดี ${stuName} แจ้งเตือนการเข้าเรียน ${className}`

  let mailOptions = {
    from: 'cpe.facedetection@gmail.com',
    to: sendTo,
    subject: subject,
    html: `<p>ยืนยันการเข้าเรียนวิชา ${className} ${(status === 1) ? 'ตรงเวลา' : 'สาย'} ${state}</p>
    <p>picture</p><img src="cid:face" />`,
    attachments: [
      {
        filename: 'face.jpg',
        content: Buffer.from(picture, 'base64'),
        cid: 'face'
      }
    ]
  }
  try {
    let info = await transporter.sendMail(mailOptions)
    console.log(info)
  } catch (error) {
    console.log(error)
  }
}

function timeToMinutes(time) {
  const h = time.getHours()
  const m = time.getMinutes()
  const timeInMinutes = ((h * 60) + m)
  return timeInMinutes
}

function checkAttendStatus(now, start, end, late) {
  if (now >= start && now <= (start + late))
    return 1
  else if (now > (start + late) && now <= end)
    return 2
  else if (now < start)
    return 5
  else
    return 3
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
      const pic = req.body.picture

      const dH = dateNow.getHours()
      const dM = dateNow.getMinutes()

      console.log(dH, dM)

      try {
        let classroom = await Classroom.find({
          roomId: roomId,
          day: days[dateNow.getDay()],
        }).exec()
        console.log(classroom.length)
        classroom = classroom.filter(cc => {
          // console.log((timeToMinutes(cc.start) <= timeToMinutes(dateNow) && (timeToMinutes(cc.end) >= timeToMinutes(dateNow))))
          return (timeToMinutes(cc.start) <= timeToMinutes(dateNow) && (timeToMinutes(cc.end) >= timeToMinutes(dateNow)))
        })
        // console.log(classroom.length)
        if (classroom.length === 0) {
          res.send({ message: 'no class room' })
        }
        classroom = classroom[0]
        // console.log(classroom.students)
        // console.log(classroom.day)
        

        let std = await User.findOne({ user_id: student_id, role: 'STUDENT' }).exec()
        // console.log(std)
        if (!std) {
          res.send({ 'message': 'no student in db' })
        }
        if (classroom.students.indexOf(std._id) === -1) {
          res.send({ message: `${std.name}::not student in class ${classroom.subject}` })
        }

        let toDay = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate())
        let nextDay = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + 1)
        // console.log(std._id)
        let atDate = await Attendance.findOne({ studentid: std._id, date: { $gte: toDay, $lt: nextDay }, classroomid: classroom._id }).exec()
        // console.log(atDate)
        if (atDate) {
          return res.send({ message: `${std.name}::already attendance` })
        }

        const timeNow = timeToMinutes(dateNow)
        const startTime = timeToMinutes(classroom.start)
        const endTime = timeToMinutes(classroom.end)

        const status = checkAttendStatus(timeNow, startTime, endTime, classroom.late)
        if (status === 5)
          return res.status(200).send({ message: 'class not start yet' })

        const picture = saveImage(pic, classroom._id, student_id)

        sendMail(std.email, classroom.subject, std.name, status, pic)

        const newAttend = new Attendance({
          classroomid: classroom._id,
          studentid: std._id,
          status: status,
          picture: picture,
          date: dateNow
        })

        let att = await newAttend.save()
        const emitData = { 
          _id: att._id,
          studentid: {
            name: std.name
          },
          picture: att.picture,
          status: status
        }
        io.emit('ATT', emitData)

        await Classroom.findByIdAndUpdate(classroom._id,
           { $push: { attendance: att._id } }).exec()

        console.log(att)
        payload = {
          message: `${std.name}::attendance success`
        }

        res.send(payload)
      } catch (err) {
        console.error(err)
      }
    },
    att: async (req, res) => {
      const classID = req.body.classid || ''
      if (!classID) {
        res.boom.badRequest('no classId')
      }
      const pipeline = [
        {
          "$match": {
            "classroomid": mongoose.Types.ObjectId(classID)
          }
        },
        {
          "$addFields": {
            "time": {
              "$dateToString": {
                "format": "%H:%M:%S",
                "date": "$date",
                "timezone": "+0700"
              }
            }
          }
        },
        {
          "$lookup": {
            "from": "users",
            "localField": "studentid",
            "foreignField": "_id",
            "as": "user"
          }
        },
        {
          "$replaceRoot": {
            "newRoot": {
              "$mergeObjects": [
                {
                  "$arrayElemAt": [
                    "$user",
                    0.0
                  ]
                },
                "$$ROOT"
              ]
            }
          }
        },
        {
          "$project": {
            "_id": 1.0,
            "status": 1.0,
            "date": 1.0,
            "picture": 1.0,
            "time": 1.0,
            "name": 1.0
          }
        },
        {
          "$group": {
            "_id": {
              "$dateToString": {
                "format": "%Y-%m-%d",
                "date": "$date",
                "timezone": "+0700"
              }
            },
            "students": {
              "$push": "$$ROOT"
            }
          }
        }
      ]

      try {

        const AA = await Attendance.aggregate(pipeline).exec()
        res.send(AA)

      } catch (error) {
        res.send(error)
      }
      // try {
      //   const AA = await Attendance.find({})
      //   .populate({ path: 'studentid', select: 'name'})
      //   res.send(AA)

      // } catch (error) {
      //   res.send({ message: error})
      // }
    },
    changeAttendStatus: async (req, res) => {
      let id = req.body.id || ''
      const status = req.body.status || ''
      if (!id || !status)
        res.boom.badRequest('invalid query')
      try {
        // id = mongoose.Types.ObjectId(id)
        const ss = await Attendance.findByIdAndUpdate(id, { status: status })
        res.send({ message: ss })

      } catch (error) {
        res.send(error)
      }
      res.send({ message: 'ok' })
    },

    classResult: async (req, res) => {
      const classId = req.body.classid || ''
      if (!classId) {
        res.boom.badRequest('no class id')
      }

      const pipeline = [
        {
          "$match": {
            "classroomid": mongoose.Types.ObjectId(classId)
          }
        },
        {
          "$lookup": {
            "from": "users",
            "localField": "studentid",
            "foreignField": "_id",
            "as": "user"
          }
        },
        {
          "$replaceRoot": {
            "newRoot": {
              "$mergeObjects": [
                {
                  "$arrayElemAt": [
                    "$user",
                    0.0
                  ]
                },
                "$$ROOT"
              ]
            }
          }
        },
        {
          "$project": {
            "_id": 1.0,
            "status": 1.0,
            "name": 1.0,
            "user_id": 1.0,
            "a": {
              "$cond": [
                {
                  "$eq": [
                    "$status",
                    1.0
                  ]
                },
                1.0,
                0.0
              ]
            },
            "b": {
              "$cond": [
                {
                  "$eq": [
                    "$status",
                    2.0
                  ]
                },
                1.0,
                0.0
              ]
            },
            "c": {
              "$cond": [
                {
                  "$eq": [
                    "$status",
                    3.0
                  ]
                },
                1.0,
                0.0
              ]
            }
          }
        },
        {
          "$group": {
            "_id": {
              "user_id": "$user_id",
              "name": "$name"
            },
            "countA": {
              "$sum": "$a"
            },
            "countB": {
              "$sum": "$b"
            },
            "countC": {
              "$sum": "$c"
            }
          }
        }
      ]

      try {

        const AA = await Attendance.aggregate(pipeline).exec()
        res.send(AA)

      } catch (error) {
        res.send(error)
      }
    },
    studentResult: async (req, res) => {
      const id = req.user._id || ''

      const pipeline = [
        {
          "$match": {
            "studentid": mongoose.Types.ObjectId(id)
          }
        },
        {
          "$lookup": {
            "from": "classrooms",
            "localField": "classroomid",
            "foreignField": "_id",
            "as": "classroom"
          }
        },
        {
          "$replaceRoot": {
            "newRoot": {
              "$mergeObjects": [
                {
                  "$arrayElemAt": [
                    "$classroom",
                    0.0
                  ]
                },
                "$$ROOT"
              ]
            }
          }
        },
        {
          "$project": {
            "_id": 1.0,
            "subject": 1.0,
            "status": 1.0,
            "date": 1.0,
            "a": {
              "$cond": [
                {
                  "$eq": [
                    "$status",
                    1.0
                  ]
                },
                1.0,
                0.0
              ]
            },
            "b": {
              "$cond": [
                {
                  "$eq": [
                    "$status",
                    2.0
                  ]
                },
                1.0,
                0.0
              ]
            },
            "c": {
              "$cond": [
                {
                  "$eq": [
                    "$status",
                    3.0
                  ]
                },
                1.0,
                0.0
              ]
            }
          }
        },
        {
          "$group": {
            "_id": "$subject",
            "countA": {
              "$sum": "$a"
            },
            "countB": {
              "$sum": "$b"
            },
            "countC": {
              "$sum": "$c"
            }
          }
        }
      ]
      try {

        const AA = await Attendance.aggregate(pipeline).exec()
        res.send(AA)

      } catch (error) {
        res.send(error)
      }
      
    },
    attByDate: async (req, res) => {
      const { id } = req.params

      try {
        const att = await Attendance.find({ 
          classroomid: id,
          '$where': 'this.date.toJSON().slice(0,10) == new Date().toJSON().slice(0,10)'})
          .populate({
            path: 'studentid',
            select: 'name'
          })
          res.send(att)
      } catch (err) {
        console.log(err)
        res.send({})
      }

      res.send({ message: id})

    }
  }
}

function saveImage(imageData, classId, userId) {
  console.log('start save image')
  let baseDir = '/attend_picture'
  let dates = new Date().toISOString().split('T')[0]
  let classs = classId
  let userIdd = userId

  let fileName = `${userIdd}_${Date.now()}.jpg`

  if (!fs.existsSync(`.${baseDir}/${classs}`)) {
    fs.mkdirSync(`.${baseDir}/${classs}`)
  }
  if (!fs.existsSync(`.${baseDir}/${classs}/${dates}`)) {
    fs.mkdirSync(`.${baseDir}/${classs}/${dates}`)
  }

  fs.writeFileSync(`.${baseDir}/${classs}/${dates}/${fileName}`, imageData, 'base64')
  console.log(`save complete ${baseDir}/${classs}/${dates}/${fileName}`)
  return `${baseDir}/${classs}/${dates}/${fileName}`
}
