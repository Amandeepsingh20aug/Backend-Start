import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userID = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Comment ID does not exist");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userID,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Liked removed successfully"));
  }else {
    const newLike = await Like.create({
      video: videoId,
      likedBy: userID,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Liked added successfully"));
  }

});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userID = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment ID does not exist");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userID,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Liked removed successfully"));
  }else {
    const newLike = await Like.create({
      comment: commentId,
      likedBy: userID,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Liked added successfully"));
  }


});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userID = req.user._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Tweet ID does not exist");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userID,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Liked removed successfully"));
  } else {
    const newLike = await Like.create({
      tweet: tweetId,
      likedBy: userID,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Liked added successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userID = req.user._id;

  if (!isValidObjectId(userID)) {
    throw new ApiError(400, "user Id does not exist");
  }

  const likedVideos = await Like.find({
    likedBy: userID,
    video: { $exists: true },
  }).populate("video", "title description videoFile");

  if (!likedVideos.length) {
    throw new ApiError(404, "No liked videos found for this user");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      likedVideos.map((like) => like.video),
      "Liked videos fetched successfully"
    )
  );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
