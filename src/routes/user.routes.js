import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannel,
  getUserWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccount,
  updateUserAvatarImage,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.route("/register").post(
  upload.fields([
    { name: "avatarImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccount);
router
  .route("/update-user-avatar")
  .patch(verifyJWT, upload.single("avatarImage"), updateUserAvatarImage);
router
  .route("/update-user-cover")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/c/:userName").get(verifyJWT, getUserChannel);
router.route("/history").get(verifyJWT, getUserWatchHistory);

export default router;
