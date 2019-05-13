import socketio

sio = socketio.Client()



@sio.on('connect')
def on_connect():
  print('connection established')

@sio.on('MESSAGE')
def on_message(data):
  print('message received with ', data)

@sio.on('disconnect')
def on_disconnect():
    print('disconnected from server')

sio.connect('http://localhost:3000')

sio.emit('SEND_CAMERA', 'Hello')
sio.emit('SEND_CAMERA', 'Hello')
sio.emit('SEND_CAMERA', 'Hello')
sio.wait()