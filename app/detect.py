import face_recognition
from imutils.video import WebcamVideoStream
import cv2
import imutils
import time
import requests
import base64
import socketio
import random
from PIL import Image

sio = socketio.Client()

@sio.on('connect')
def on_connect():
  print('connected!')

@sio.on('camera')
def on_camera(data):
  print('Hello')
# @sio.on('camera')
# def on_message(data):
#   print('message received with ', data)
  
print('socket stat')
sio.connect('http://localhost:3000')
print('socket connect')



stream = WebcamVideoStream(src=0).start()
stream2 = WebcamVideoStream(src=1).start()
roomid = 413
namelist = {}

while True:
  frame = stream.read()
  result = face_recognition.predict(frame)
  frame = imutils.resize(frame, width=480)
  
  if len(result) > 0:
    for name, rect, cst in result:
      left = rect.left()
      top = rect.top()
      right = rect.right()
      bottom = rect.bottom()
      if left < 20:
          left = 20
      if top < 35:
          top = 35
      if right > 460:
          right = 460
      if bottom > 325:
          bottom = 325
      if name in namelist:
        namelist[name] += 1
        if namelist[name] > 11:
            print(name)
            if name != 'unknow':
              FF = frame[top-35:bottom+35, left-20:right+20].copy()
              
              ba = base64.b64encode(cv2.imencode('.jpg', FF)[1].tobytes())
              # print(type(ba))
              # print(ba)
              sio.emit('SEND_CAMERA1', {'id': int(random.random()*100000000),'name': name, 'pic': ba})
              r = requests.post('http://localhost:3000/attend', data= { "user_id": name, "roomid": roomid, "picture": ba})
              
              print(r.json())
            else:
              FF = frame[top-35:bottom+35, left-20:right+20].copy()
              ba = base64.b64encode(cv2.imencode('.jpg', FF)[1].tobytes())
              # print(ba)
              sio.emit('SEND_CAMERA1', {'id': int(random.random()*100000000), 'name': 'unknow', 'pic': ba})
            namelist[name] = 0
      else:
          namelist[name] = 1

      if int(time.time()%10) == 1:
          namelist = {}
  
  frame = stream2.read()
  result = face_recognition.predict(frame)
  frame = imutils.resize(frame, width=480)
  if len(result) > 0:
    for name, rect, cst in result:
      left = rect.left()
      top = rect.top()
      right = rect.right()
      bottom = rect.bottom()
      if left < 20:
          left = 20
      if top < 35:
          top = 35
      if right > 460:
          right = 460
      if bottom > 325:
          bottom = 325
      if name in namelist:
        namelist[name] += 1
        if namelist[name] > 11:
            print(name)
            if name != 'unknow':
              FF = frame[top-35:bottom+35, left-20:right+20].copy()
              
              ba = base64.b64encode(cv2.imencode('.jpg', FF)[1].tobytes())
              # print(type(ba))
              sio.emit('SEND_CAMERA2', {'id': int(random.random()*100000000),'name': name, 'pic': ba})
              r = requests.post('http://localhost:3000/attend', data= { "user_id": name, "roomid": roomid, "picture": ba})
              print(r.json())
            else:
              FF = frame[top-35:bottom+35, left-20:right+20].copy()
              ba = base64.b64encode(cv2.imencode('.jpg', FF)[1].tobytes())
              sio.emit('SEND_CAMERA2', {'id': int(random.random()*100000000), 'name': 'unknow', 'pic': ba})
            namelist[name] = 0
      else:
          namelist[name] = 1

      if int(time.time()%10) == 1:
          namelist = {}



sio.wait()
stream.stop()
stream2.stop()