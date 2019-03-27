import face_recognition
from imutils.video import WebcamVideoStream
import cv2
import imutils
import time
import requests
stream = WebcamVideoStream(src=0).start()
roomid = 413
namelist = {}
while True:
  frame = stream.read()
  result = face_recognition.predict(frame)
  frame = imutils.resize(frame, width=480)

  if len(result) > 0:
    for name, rect, cst in result:

      if name in namelist:
        namelist[name] += 1
        if namelist[name] > 11:
            print(name)
            if name != 'unknow':
              r = requests.post('http://localhost:3000/attend', data= { "user_id": name, "roomid": roomid})
              print(r.json())
            namelist[name] = 0
      else:
          namelist[name] = 1

      if int(time.time()%10) == 1:
          namelist = {}


stream.stop()