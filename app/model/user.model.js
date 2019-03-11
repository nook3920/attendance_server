const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
    user_id: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    password: String,
    gender: String,
    name: {
        type: String,
        trim: true
    },
    avatar: String,
    role: {
        type: String,
        trim: true,
        uppercase: true
    },
    classroom: [{
        type: Schema.Types.ObjectId,
        ref:'Classroom'
    }],
    picture: [String]

})

module.exports = mongoose.model('User', UserSchema)