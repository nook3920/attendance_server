import face_recognition
from quart import Quart, jsonify, request

app = Quart(__name__)

@app.route('/')
async def hello():
  return 'hello'

@app.route('/train')
async def train():
  message = face_recognition.train()
  payload = { 'message': message}
  return jsonify(payload)

  
@app.route('/delete')
async def delete():
  filename = request.args.get('filename', None)
  if filename == None:
    return jsonify({'message': 'no file name'})
  payload =  face_recognition.delete_computed_descriptor(filename)
  return jsonify({ 'message': payload})

app.run()