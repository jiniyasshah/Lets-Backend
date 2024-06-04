import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getVideoDurationInSeconds } from "get-video-duration";

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished, thumbnail } = req.body;
  if (!title || !thumbnail) {
    throw new ApiError(
      400,
      `Video ${title ? "thumbnail" : "title"} must not be empty !!`
    );
  }
  const videoLocalPath = req.file?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video is missing !!");
  }
  const videoDuration = await getVideoDurationInSeconds(videoLocalPath).then(
    (duration) => {
      console.log(duration);
      return duration;
    }
  );
  const uploadedVideo = videoLocalPath
    ? await uploadOnCloudinary(videoLocalPath)
    : null;

  if (!uploadedVideo.url) {
    throw new ApiError(400, "Video upload failed. Retry !!");
  }

  const video = await Video.create({
    videoFile: uploadedVideo.url,
    title,
    thumbnail,
    duration: videoDuration,
    description,
    isPublished,
    owner: req.user?._id,
  });
  const uploadedVideoData = await Video.find({ title: video.title });

  if (!uploadedVideoData) {
    throw new ApiError(500, "Something went wrong while uploading video !!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video uploaded successfully !!"));
});

export { uploadVideo };
