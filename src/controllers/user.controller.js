import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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

  if (!avatarImage) {
    throw new ApiError(400, "Avatar Image upload failed. Retry !!");
  }

  if (coverImageLocalPath && !coverImage) {
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
