import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js';
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";


const genrateAccessAndRefreshTokens = async(userId) =>{
   try {
      const user = await User.findById(userId) 
      const accessToken = user.genrateAccessToken()
      const refreshToken = user.genrateRefreshToken()
      
      user.refreshToken = refreshToken
      await user.save({validateBeforeSave : false})

      return {accessToken,refreshToken}

   } catch (error) {
     throw new ApiError(500, "Something went wrong while genrating refresh and access token")
   }
}

const registerUser = asyncHandler( async(req,res) =>{
  //Take req from user
  // validation - not empty
  // check if user already exists : username , email
  // check for images , check for avatar
  // upload them to cloudinary, avatar
  // create user Object - create entry in DB
  // remove password and refresh token field from response
  // check for user creation 
  // return res

  const {fullname, email , username, password } = req.body
  // console.log(fullname);
  // console.log(email,'email');
  if(
    [fullname ,email ,username ,password].some((field)=>
    field?.trim() === "")
  ){
   throw new ApiError(400 , "All fields are required")
  }
  
 const existedUser = await User.findOne({
    $or : [{ username },{ email }]
  })

  if(existedUser){
    throw new ApiError(409 , "User with email or username alreday exist")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath =  req.files?.coverImage[0]?.path;

  let coverLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
   coverLocalPath = req.files.coverImage[0].path
  }

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverLocalPath)


  if(!avatar){
    throw new ApiError(400, "Avatar file is required")
  }

  const user = await User.create({
    fullname,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500 , "Something went wrong while regestring the user")
  }
  
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )
   
})

const loginUser = asyncHandler(async (req,res) =>{
   // Take email and password as the user request
   // Vaidate both email and password should not be empty
   // Find in database if user exist or not 
   // password check
   // access and refresh token
   // send cookie 

   const {username , password , email} = req.body

   if(!username || !email){
    throw new ApiError(400, "username or email is required")
   }

  const findUser = await User.findOne({
    $or : [{email,username}]
  })

  // console.log(findUser,'User');

  if(!findUser){
    throw new ApiError(404, "User dose not exist")
  }

 const isPasswordValid = await findUser.isPasswordCorrect(password)

 if(!isPasswordValid){
  throw new ApiError(401, "Invalid User credentials")
}

 const {accessToken,refreshToken} = await genrateAccessAndRefreshTokens(findUser._id)

 const loggedInUser = await User.findById(findUser._id).select("-password -refreshToken")

 const options = {
  httpOnly : true,
  secure : true
 }

 return res.status(200).cookie("accessToken", accessToken ,options).cookie("refreshToken", refreshToken, options)
 .json(
  new ApiResponse(200, {
     user : loggedInUser ,accessToken ,refreshToken
  },
   "User looged In Successfully")
 )

})

const logoutUser = asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset : {
        refreshToken : 1 //this removes the field from document
      }
    },
    {
      new : true
    }
  )
  const options = {
    httpOnly : true,
    secure : true
   }
   return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200 ,{}, "User looged Out"))  
})

const refreshAccessToken  = asyncHandler(async(req,res)=>{
  const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
    
    if(!user){
      throw new ApiError(401, "Invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    const options = {
      httpOnly : true,
      secure : true
    }
  
    const tokens = await genrateAccessAndRefreshTokens(user._id)
  
    const{accessToken, newrefreshToken} = tokens
  
    return res.status(200)
    .cookie("accessToken" ,accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
      new ApiResponse(
        200,
        {accessToken , newrefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
     throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
 const {oldPassword, newPassword} = req.body

 const user = await User.findById(req.user?._id)

 const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

 if(!isPasswordCorrect){
  throw new ApiError(400 , "Invalid old password")
 }

 user.password = newPassword
 await user.save({validateBeforeSave : false})

 return res.status(200).json(
  new ApiResponse(200,{},"Password change successfully")
 )

})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res.status(200).json(
    new ApiResponse (200,
      req.user, "Current user fetched successfully")
  )
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullname , email} = req.body

  if(!fullname || !email){
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set : {
        fullname,
        email
      }
    },
    {new : true}
  ).select("-password")

  return res.status(200)
  .json(new ApiResponse(200,user,"Account details updated successfully"))
   
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400 , "Avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400 , "Error while uploading")
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
     $set : {avatar : avatar.url}
    },
    {new : true}
  ).select("-password")

  return res.status(200)
  .json(
    new ApiResponse(200 , user , "Avatar Updated successfully")
  )

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
    throw new ApiError(400 , "Cover image is missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new ApiError(400 , "Error while uploading")
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
     $set : { coverImage : coverImage.url}
    },
    {new : true}
  ).select("-password")

  return res.status(200)
  .json(
    new ApiResponse(200 , user , "Cover Image Updated successfully")
  )

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
  const {username} = req.params

  if(!username?.trim()){
    throw new ApiError(400 , 'Username is missing')
  }
  
  const channel = await User.aggregate([
    {
      $match : {
        username : username?.toLowerCase()
      }
    },
    {
      $lookup : {
        from : "subscriptions",
        localField : "_id",
        foreignField : "channel", //Finding the subscriber of user with help of channel
        as : "subscribers"
      }
    },
    {
      $lookup : {
        from : "subscriptions",
        localField : "_id",
        foreignField : "subscriber", // Finding how many channels the user has subscribe 
        as : "subscribedTo"
      }
    },
    {
      $addFields : {
        subscriberCount : {
          $size : "$subscribers"
        },
        channelSubscribedToCount : {
          $size : "$subscribedTo"
        },
        isSubscribed : {
          $cond : {
            if : {$in : [req.user?._id, "$subscribers.subscriber"]},
            then : true,
            else : false
          }
        }
      }
    },
    {
      $project : {
        fullname : 1,
        username : 1,
        email  : 1,
        subscriberCount : 1,
        channelSubscribedToCount : 1,
        isSubscribed : 1,
        avatar : 1,
        coverImage : 1
      }
    }
  ])
 
  if(!channel?.length){
    throw new ApiError(404 , "Channel does not exist")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200 , channel[0],"User Channel fecthed successfully")
  )

})

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match : {
        _id : new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup : {
        from : "videos",
        localField : "watchHistory",
        foreignField : "_id",
        as  : "watchHistory",
        pipeline : [
          {
            $lookup : {
              from : "users",
              localField : "owner",
              foreignField : "_id",
              as : "owner",
              pipeline : [
                {
                  $project : {
                    fullname : 1,
                    username : 1,
                    avatar : 1
                  }
                }
              ]
            }
          },
          {
            $addFields : {
              owner : {
                $first : "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res.status(200)
  .json(
    new ApiResponse(
      200, user[0].watchHistory,
      "Watch history fetched successfully"
    )
  )

})


export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory}