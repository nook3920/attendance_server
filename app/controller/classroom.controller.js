const Classroom = require('../model/classroom.model')
const Atten = require('../model/attendance.model')
const mongoose = require('mongoose')
const User = require('../model/user.model')
const config = require('../config/config')
const Agenda = require('agenda')
const days = { 0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday" }
const agenda = new Agenda({ db: {address: 'mongodb://localhost:27017/attendancedb', collection: 'attendJob'}})

function getDay(day) {
  return Object.keys(days).find(key => days[key] === day)
}

function updateNotAttend(stuid, classid){
  if(!stuid.length)
    return
  dNow = new Date('2019-03-12')
  stSet = stuid.map(st => {
    return {
      studentid: st,
      classroomid: classid,
      status: 3,
      date: dNow,
      picture: 'N/A'
    }
  })
  Atten.insertMany(stSet, (err, docs) => {
    if(err)
      console.log(err)
    // console.log(docs)
  })
  // console.log(stSet)
}

 agenda.define('testJob', async (job, done) => {
  const {classId} = job.attrs.data
  console.log('test job done! ', classId)
  // try {
  //   const classroom = await 
  // } catch (err) {
    
  // }
  done()
})

agenda.start().then(() => { console.log('agenda ready')})


exports.classroomList = async (req, res) => {
  console.log('classroom list')
  try {
    const CR = await Classroom.findById('5c878b8a139fdb37cc753224')
    const StList = CR.students.map(aa => {
      return aa.toString()
    })
    const att = await Atten.find({ 
      classroomid: '5c878b8a139fdb37cc753224',
      '$where': 'this.date.toJSON().slice(0,10) == "2019-03-12"'}).select({ studentid: 1})

    const StAtt = att.map(ss => {
      return ss.studentid.toString()
    })
    console.log(StList)
    console.log(StAtt)
    let notAtt = StList.filter(function(val) {
      // console.log(StAtt.indexOf(val))
      return StAtt.indexOf(val) == -1
    })
    notAtt = notAtt.map(ss => {
      return mongoose.Types.ObjectId(ss)
    })
    console.log(notAtt.length)
    updateNotAttend(notAtt, '5c878b8a139fdb37cc753224')
    
  } catch (err) {
    console.log(err)
  }
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

    const minute = new Date(req.body.classTime[1]).getMinutes()
    const hour = new Date(req.body.classTime[1]).getHours()
    const dd = getDay(req.body.classDay)

    const cron = `${minute} ${hour} * * ${dd}`

    const jj = agenda.create('testJob', { classId: newClass._id })
    await jj.repeatEvery(cron).save()
    

    User.updateMany({_id: { $in: newClass.students }},
      { $push: {classroom: newClass._id}},
      {multi: true},
      (err, doc) => {
        if(err)
          console.log(err)
        console.log(doc)
      })

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

exports.delClass = async (req, res) => {
  const { id } = req.params
  try {
    
    const classRoom = await Classroom.findById(id)
    User.updateMany({_id: { $in: classRoom.students }},
      { $pull: {classroom: classRoom._id}},
      { multi: true},
      (err, doc) => {
        if(err)
        console.log(err)
        console.log(doc)
      })
      
      Classroom.deleteOne({ _id: id},(err, doc) => {
        if(err)
        console.log(err)
        console.log(doc)
      })

      agenda.cancel({})
      res.send({ message: `delete classroom `})
    } catch (error) {
      res.boom.badImplementation(err)
    }
}