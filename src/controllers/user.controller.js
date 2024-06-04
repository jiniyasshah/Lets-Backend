import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong during generating access and refresh token !!"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { userName, fullName, email, password } = req.body;
  if (
    [userName, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(404, "All fields are required !!");
  }
  const isUserRegistered = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (isUserRegistered) {
    throw new ApiError(409, "User is already registered !!");
  }
  let avatarImageLocalPath;
  let coverImageLocalPath;

  if (req.files && req.files.avatarImage) {
    avatarImageLocalPath = req.files.avatarImage[0]?.path;
  }

  if (req.files && req.files.coverImage) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }

  if (!avatarImageLocalPath) {
    throw new ApiError(400, "Avatar Image must be provided !!");
  }
  const avatarImage = await uploadOnCloudinary(avatarImageLocalPath);

  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatarImage.url) {
    throw new ApiError(400, "Avatar Image upload failed. Retry !!");
  }

  if (coverImageLocalPath && !coverImage.url) {
    throw new ApiError(400, "Cover Image upload failed. Retry !!");
  }

  const user = await User.create({
    userName,
    email,
    password,
    fullName,
    avatarImage: avatarImage.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user !!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully !!"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;
  if (!(email || userName) || !password) {
    throw new ApiError(
      400,
      `${!email ? `Username ${!userName ? "or Email " : ""}and ` : !userName ? "Email and " : ""}${!password ? "Password " : ""}is required !!`
    );
  }

  const registeredUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!registeredUser) {
    throw new ApiError(404, "User doesn't exists !!");
  }
  const isPasswordValid = await registeredUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials !!");
  }
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    registeredUser._id
  );

  const loggedUser = await User.findById(registeredUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully !!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User has been logged out !!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request !!");
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const userData = await User.findById(decodedToken._id);
    if (!userData) {
      throw new ApiError(401, "Invalid Access Token !!");
    }

    if (incomingRefreshToken !== userData?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired !!");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
      userData._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Tokens refreshed successfully !!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token !!");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError(404, "All fields are required !!");
  }
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      401,
      "New Password and Confirm Password must be same !!"
    );
  }
  if (oldPassword == newPassword) {
    throw new ApiError(
      401,
      "New Password must be different from old password !!"
    );
  }
  const userData = await User.findById(req.user?._id);
  const isPasswordValid = await userData.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials !!");
  }
  userData.password = newPassword;
  await userData.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully changed the password !!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Succesfully fetched user data !!"));
});

const updateAccount = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;

  if (!email && !fullName) {
    throw new ApiError(400, "At least one of the fields is required!!");
  }
  //Initialize the updateFields object with empty strings is not an optimal approach because it would still include the fields in the update
  const updateFields = {};
  if (email) updateFields.email = email;
  if (fullName) updateFields.fullName = fullName;

  const userData = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { new: true } // Returns the updated document
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "Account details updated successfully")
    );
});

const updateUserAvatarImage = asyncHandler(async (req, res) => {
  const avatarImageLocalPath = req.file?.path;

  if (!avatarImageLocalPath) {
    throw new ApiError(400, "Avatar Image is missing !!");
  }
  const avatarImage = avatarImageLocalPath
    ? await uploadOnCloudinary(avatarImageLocalPath)
    : null;

  if (!avatarImage.url) {
    throw new ApiError(400, "Avatar Image upload failed. Retry !!");
  }

  const userData = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatarImage: avatarImage.url } },
    { new: true } // Returns the updated document
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "Avatar Image updated successfully !!")
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is missing !!");
  }
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  //Todo: Delete Old Cover Image

  if (!coverImage.url) {
    throw new ApiError(400, "Cover Image upload failed. Retry !!");
  }

  const userData = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true } // Returns the updated document
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "Cover Image updated successfully !!")
    );
});

const getUserChannel = asyncHandler(async (req, res) => {
  const { userName } = req.params;
  if (!userName?.trim()) {
    throw new ApiError(400, "User name is missing !!");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: userName?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Successfully fetched channel !!"));
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Successfully fetched watch history !!"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccount,
  updateUserAvatarImage,
  updateUserCoverImage,
  getUserChannel,
  getUserWatchHistory,
};
