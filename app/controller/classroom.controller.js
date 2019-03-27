const Classroom = require('../model/classroom.model')
const mongoose = require('mongoose')
const User = require('../model/user.model')
const config = require('../config/config')
const Agenda = require('agenda')

const agenda = new Agenda({ db: {address: 'mongodb://localhost:27017/attendancedb', collection: 'attendJob'}})
agenda.define('testJob', (job, done) => {
  console.log('test job done!')
  
  done()
})

agenda.start().then(() => { console.log('agenda ready')})


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

exports.createClass = async (req, res) => {
  console.log('create classroom')

  try {
      const classRoom = new Classroom({
      subject: req.body.subjectName,
      start: new Date(req.body.classTime[0]),
      end: new Date(req.body.classTime[1]),
      late: parseInt(req.body.late),
      students: req.body.students,
      teacher: req.user._id,
      day: req.body.classDay,
      roomId: req.body.roomId
    })
    let newClass = await classRoom.save()
    // console.log(newClass._id)



    
    const jj = agenda.create('testJob')
    await jj.repeatEvery('1 minutes').save()
    

    User.updateMany({_id: { $in: newClass.students }},
      { $push: {classroom: newClass._id}},
      {multi: true},
      (err, doc) => {
        if(err)
          console.log(err)
        console.log(doc)
      })

    // newClass.students.forEach(stu => {
    //   User.findOneAndUpdate({_id: stu},
    //     { $push: { classroom: newClass._id}},
    //     { new: true},
    //     (err, re) => {
    //       if(err)
    //         console.log(err)
    //       // console.log(re)
    //     }
    //   )
    // })

    
    
    res.status(201).send({
      message: 'classroom created'
    })
    return
  } catch (err) {
    res.boom.badImplementation(err)
    return
  }
  // res.send(payload)
}

exports.getClassById = async (req, res) => {
  const id = req.params.id
  try {
    const classroom = await Classroom.findById(id).populate({ path: 'students', select: 'user_id name'}).populate({ path: 'teacher', select: 'name' })
    res.send(classroom)
  } catch (err) {
    console.log(err)
    res.send(err)
  }
  res.send(classroom)
}