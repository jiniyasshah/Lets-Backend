import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

import { User } from "../models/user.model.js";
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!accessToken) {
      throw new ApiError(401, "Unauthorized request !!");
    }
    const decodedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const loggedUser = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!loggedUser) {
      throw new ApiError(401, "Invalid Access Token !!");
    }
    req.user = loggedUser;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token !!");
  }
});
