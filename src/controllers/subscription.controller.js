import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "ChannelId is not valid");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscriptiontoogle = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  if (subscriptiontoogle) {
    await Subscription.findByIdAndDelete(existingSubscription._id);
  } else {
    await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Subscription toggeled successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "ChannelId is not valid");
  }

  const userSubscriber = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "totalusersubscriber",
      },
    },
    {
      $addFields: {
        totalusersubscriber: { $first: "$totalusersubscriber" },
      },
    },
    {
      $project: {
        _id: 0,
        "totalusersubscriber._id": 1,
        "totalusersubscriber.username": 1,
        "totalusersubscriber.fullname": 1,
        "totalusersubscriber.avatar": 1,
        "totalusersubscriber.coverImage": 1,
        "totalusersubscriber.email": 1,
      },
    },
  ]);

  if (!userSubscriber.length) {
    throw new ApiError(404, "No subscribers found for this channel");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, userSubscriber, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "subscriberId is not valid");
  }

  const channelsSubscribed = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
      },
    },
    {
      $unwind: "$channel",
    },
    {
      $project: {
        _id: 0,
        "channel._id": 1,
        "channel.username": 1,
        "channel.fullname": 1,
        "channel.email": 1,
        "channel.avatar": 1,
        "channel.coverImage": 1,
      },
    },
  ]);

  if (!subscribedChannel.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          [],
          "No subscribed channels found for this subscriber"
        )
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannel,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
