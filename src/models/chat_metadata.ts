import mongoose from 'mongoose'

const ChatMetadataSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        immutable: true
    },
    startedAt: {
        type: Date,
        required: true,
        immutable: true
    },
    size: {
        type: Number,
        required: true,
        immutable: true
    },
    members: [{
        id: String,
        noun: String
    }],
    endedAt: Date,
    messageCount: {
        type: Number,
        required: true,
        default: 0
    }
})

export default mongoose.model('ChatMetadata', ChatMetadataSchema)
