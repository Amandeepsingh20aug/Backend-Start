import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body

    if(!content){
        throw new ApiError(400,"Content is required")
    }

    const tweet = await Tweet.create({
       content,
       owner : req.user._id
    })

   if(!tweet){
    throw new ApiError(500 , "Someting went wrong while creating a tweet")
   }

   return res.status(200)
   .json(
    new ApiResponse(200, tweet , "Tweet created Successfully")
   )
})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!userId?.trim()){
        throw new ApiError(400, "UserId is not found")
    }

    const allTweets = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : "tweets",
                localField : '_id',
                foreignField : 'owner',
                as : "totaltweets"
            }
        },
        {
            $project : {
                totaltweets :  1
            }
        }
    ])

    if(!allTweets.length){
        throw new ApiError(400, "User does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, allTweets , "Tweets fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { newTweet } = req.body;

    if (!newTweet.trim()) {
        throw new ApiError(400, "Updated Tweet is required");
    }

    if (!tweetId?.trim()) {
        throw new ApiError(400, "Tweet ID does not exist");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: { content: newTweet }
        },
        {
            new: true
        }
    );

    if (!updatedTweet) {
        throw new ApiError(400, "The tweet to be updated does not exist");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet has been updated successfully")
    );
})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if(!tweetId?.trim()){
        throw new ApiError(400 , "Tweet id does not exist")
    }

    const deleteTweet = await Tweet.findByIdAndUpdate(tweetId)

    if(!deleteTweet){
        throw new ApiError(404, "Tweet not found");
    }

      return res.status(200)
      .json(
        new ApiResponse(200 ,null , "Tweet deleted successfully")
      )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}