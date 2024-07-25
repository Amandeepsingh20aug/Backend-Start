import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "UserId is not valid");
  }

  const allVideos = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "totalVideos",
      },
    },
    {
      $addFields: {
        videoCount: { $size: "$totalVideos" },
      },
    },
    {
      $project: {
        totalVideos: 1,
        videoCount: 1,
      },
    },
  ]);

  if (!allVideos || !allVideos.length) {
    throw new ApiError(404, "No videos found");
  }

  const totalVideos = allVideos[0].totalVideos;

  const filteredVideos = totalVideos.filter((video) =>
    video.title.toLowerCase().includes(query.toLowerCase())
  );

  filteredVideos.sort((a, b) => {
    if (sortType === "asc") {
      return a[sortBy] > b[sortBy] ? 1 : -1;
    } else {
      return a[sortBy] < b[sortBy] ? 1 : -1;
    }
  });

  const startIndex = (page - 1) * limit;
  const paginatedVideos = filteredVideos.slice(startIndex, startIndex + limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos: paginatedVideos, totalVideos: filteredVideos.length },
        "Videos fetched successfully"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  if (!title || !description) {
    throw new ApiError(400, "Title and description is required");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile?.url || !thumbnail?.url) {
    throw new ApiError(
      400,
      "Error on uploading video or thumbnail on cloudinary"
    );
  }

  const videoDuration = videoFile.duration;

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title: title,
    description: description,
    duration: videoDuration,
    isPublished: true,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const getVideo = await Video.findById(videoId);

  if (!getVideo) {
    throw new ApiError(400, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, getVideo, "Video fecthed succesfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description is required");
  }

  const thumbnailPublicUrl = req.file?.path;

  if (!thumbnailPublicUrl) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailPublicUrl);

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail not uploaded in uploadVideo");
  }

  const videoUpdate = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  if (!videoUpdate) {
    throw new ApiError(400, "Video not found");
  }

  return res
    .status(200)
    .json(
        new ApiResponse(200, videoUpdate, "video updated successfully")
    )
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  await Video.findByIdAndDelete(videoId);

  return res.status(200)
  .json(
    new ApiResponse(200 , {} , "Video Deleted successfully")
  )

});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);

  if(!video){
    throw new ApiError(400 , "Video does not exist")
  }

  const newStatus = video.isPublished ? false : true

  video.isPublished = newStatus
  await video.save({validateBeforeSave : false})

  return res.status(200)
  .json(
    new ApiResponse(200,video,"Publish status of video toggled successfully")
  )

});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
