var express = require('express')
var bodyParser = require('body-parser')
var cors = require('cors')
const mongoose = require('mongoose')
var boom = require('express-boom')
var app = express()
var logger = require('morgan')
app.use(logger('dev'))
app.use(boom())
app.use(cors())
app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({ extended: false , limit: '50mb'}))
app.use('/avatar', express.static('avatar'))
app.use('/datasets', express.static('datasets'))
const config = require('./config/config')

mongoose.Promise = global.Promise
mongoose.connect(config.url, { useNewUrlParser: true})
.then(() => {
  console.log('Succesfully connected to MongoDB')
})
.catch(err => {
  console.log('Could not connect to MongoDB:' + err)
})


app.get('/', (req, res) => {
  res.send({ message: 'Hello World'})
})

var server = app.listen(3000, '0.0.0.0', () => {
  var host = server.address().address
  var port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
})

server.on('ready', () => console.log('agenda ready!'))

const io = require('socket.io')(server)
require('./router/router')(app, io)

io.on('connection', socket => {
  console.log(socket.id)
  socket.on('SEND_MESSAGE', data => {
    io.emit('MESSAGE', data)
  })
})