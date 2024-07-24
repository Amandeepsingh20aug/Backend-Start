import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    if(!videoId.trim()){
        throw new ApiError(400, "Video id not found")
    }

    const totalComments = await Comment.countDocuments({ video: videoId });

    const getComments = Comment.find({video : videoId})
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

    if(!getComments.length){
        throw new ApiError(404, "No Comments found")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200, {totalComments,getComments, page, limit}, "Comments fetched successfully")
    )

})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if(!videoId.trim()){
        throw new ApiError(400, "Video id not found")
    }

    if(!content.trim()){
        throw new ApiError(400, "Comment is required")
    }

    const comment = await Comment.create(
        {
            content,
            video : videoId,
            owner : req.user._id
        }
    )

    if(!comment){
        throw new ApiError(500 , "Someting went wrong while creating a comment")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , comment , "Comment created successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {newComment} = req.body

    if(!commentId?.trim()){
        throw new ApiError(400, "Comment id not found")
    }

    const newUpdateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content : newComment
            }
        },
        {new :true}
    )

    if(!newUpdateComment) {
        throw new ApiError(404 , "The tweet to be updated does not exist")
    }

    return res.status(200)
    .json(
        new ApiResponse(200 , newUpdateComment , "Comment has been updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!commentId?.trim()){
        throw new ApiError(400, "Comment id not found")
    }

    await Comment.findByIdAndDelete(commentId)

    return res.status(200)
    .json(
        new ApiResponse(200, {} , "Comment deleted successfully")
    )

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }