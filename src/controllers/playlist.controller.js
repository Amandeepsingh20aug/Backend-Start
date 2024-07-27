import mongoose, {isValidObjectId} from "mongoose"
import {PlayList} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name || !description){
      throw new ApiError(400 , "name and description is required")
    }
    
    const playlist = await PlayList.create(
      {
        name,
        description,
        owner : req.user._id
      }
    )

    if(!playlist){
      throw new ApiError(404 , "Error in creating playlist")
    }

    return res.status(200)
    .json(
      new ApiResponse(200, playlist , "Playlist created successfully")
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!isValidObjectId(userId)){
      throw new ApiError(400 , "UserId is not valid")
    }

    const getUserPlaylist = await PlayList.find({owner : userId})

    if(!getUserPlaylist){
      throw new ApiError(404 , "No playlist found")
    }

    return res.status(200)
    .json(
      new ApiResponse(200, getUserPlaylist, "User Playlist fecthed successfully")
    )
    
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)){
      throw new ApiError(400 , "Playlist Id is not valid")
    }

    const playlistById = await PlayList.findById(playlistId)

    if(!playlistById){
      throw new ApiError(400 , "Playlist not found")
    }

    return res.status(200)
    .json(
      new ApiResponse(200, playlistById , "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
      throw new ApiError(400, "Playlist or videoID is not valid")
    }

    const addVideo = await PlayList.findByIdAndUpdate(
      playlistId,
      {
        $push : {videos : videoId}
      },
      {
        new : true
      }
    )

    if(!addVideo){
      throw new ApiError(404 , "Unable to update Playlist")
    }

    return res.status(200)
    .json(
      new ApiResponse(200 , addVideo , 'Video added to playlist successfully')
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
      throw new ApiError(400, "Playlist or videoID is not valid")
    }
    
    const removeVideo = await PlayList.findByIdAndUpdate(
      playlistId,
      {
        $pull : {videos : videoId}
      },
      {
        new :true
      }
    )

    if(!removeVideo){
      throw new ApiError(404 , "Unable to remove video from playlist")
    }

    return res.status(200)
    .json(
      new ApiResponse(200 , removeVideo , "Video removed successfully from playlist")
    )

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)){
      throw new ApiError(400 , "Playlist Id is not valid")
    }

    await PlayList.findByIdAndDelete(playlistId)

    return res.status(200)
    .json(
      new ApiResponse(200 , {} , "Playlist deleted Successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if(!isValidObjectId(playlistId)){
      throw new ApiError(400 , "Playlist Id is not valid")
    }

    if(!name.trim() || !description.trim()){
      throw new ApiError(400 , "name and description is required" )
    }

    const playlistUpdate = await PlayList.findByIdAndUpdate(
      playlistId,
      {
        $set : {
          name,
          description
        }
      },
      {
        new : true
      }
    )

    if(!playlistUpdate){
      throw new ApiError(404 , "Unable to update Playlist")
    }

    return res.status(200)
    .json(
      new ApiResponse(200, playlistUpdate , "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}