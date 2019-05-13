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
  dNow = new Date()
  stSet = stuid.map(st => {
    return {
      studentid: st,
      classroomid: classid,
      status: 3,
      date: dNow,
      picture: '/attend_picture/a.jpg'
    }
  })
  Atten.insertMany(stSet, (err, docs) => {
    if(err)
      console.log(err)
    // console.log(docs)
  })
  // console.log(stSet)
}


exports.endClass = async (req, res) => {
  const classId = req.body.classId
  const dNow = new Date().toISOString().split('T')[0]
  const dd= new Date()
  console.log('test job done! ', dNow)
  try {
    const CR = await Classroom.findById(classId)
    const dEnd = new Date(CR.end)
    console.log(dEnd)
    if(dEnd > dd){
      return 0
    }

    const StList = CR.students.map(aa => {
      return aa.toString()
    })
    const att = await Atten.find({ 
      classroomid: classId,
      '$where': 'this.date.toJSON().slice(0,10) == new Date().toJSON().slice(0,10)'}).select({ studentid: 1})
    console.log(att)
    
    const StAtt = att.map(ss => {
      return ss.studentid.toString()
    })

    let notAtt = StList.filter(function(val) {
      // console.log(StAtt.indexOf(val))
      return StAtt.indexOf(val) == -1
    })
    notAtt = notAtt.map(ss => {
      return mongoose.Types.ObjectId(ss)
    })
    console.log(notAtt.length)
    updateNotAttend(notAtt, classId)
    res.status(200).send({ message: 'class ending!'})
  } catch (err) {
    console.log(err)
    res.status(400).send({ message: 'class end error!'})
  }
}

 agenda.define('testJob', async (job, done) => {
  const {classId} = job.attrs.data
  const dNow = new Date().toISOString().split('T')[0]
  const dd= new Date()
  console.log('test job done! ', dNow)
  try {
    const CR = await Classroom.findById(classId)
    const dEnd = new Date(CR.end)
    console.log(dEnd)
    if(dEnd > dd){
      return 0
    }

    const StList = CR.students.map(aa => {
      return aa.toString()
    })
    const att = await Atten.find({ 
      classroomid: classId,
      '$where': 'this.date.toJSON().slice(0,10) == new Date().toJSON().slice(0,10)'}).select({ studentid: 1})
    console.log(att)
    
    const StAtt = att.map(ss => {
      return ss.studentid.toString()
    })

    let notAtt = StList.filter(function(val) {
      // console.log(StAtt.indexOf(val))
      return StAtt.indexOf(val) == -1
    })
    notAtt = notAtt.map(ss => {
      return mongoose.Types.ObjectId(ss)
    })
    console.log(notAtt.length)
    updateNotAttend(notAtt, classId)
  } catch (err) {
    console.log(err)
  }
  done()
})

agenda.start().then(() => { console.log('agenda ready')})


exports.classroomList = async (req, res) => {
  console.log('classroom list')
  const userid = mongoose.Types.ObjectId(req.user._id)

  

  try {
    const classrooms = await Classroom.find({ teacher : userid}).populate({
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

    // const cron = `${minute} ${hour} * * ${dd}`

    // const jj = agenda.create('testJob', { classId: newClass._id })
    // jj.priority('highest')
    // await jj.repeatEvery(cron).save()
    

    User.updateMany({_id: { $in: newClass.students }},
      { $push: {classroom: newClass._id}},
      {multi: true},
      (err, doc) => {
        if(err)
          console.log(err)
        console.log(doc)
      })
    
    // await Atten.deleteMany({classroomid: newClass._id}).exec()
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
      
      await Atten.deleteMany({classroomid: id}).exec()

      agenda.cancel({"data.classId": mongoose.Types.ObjectId(id)}, (err, numRemove) => {
        if(err) console.log(err)
        console.log(numRemove)
      })
      res.send({ message: `delete classroom `})
    } catch (error) {
      console.log(error)
      res.boom.badImplementation(error)
    }
}