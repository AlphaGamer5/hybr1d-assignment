import express from "express";
import { APIError, HTTPStatus } from "../../utils/apierror.util.js";
import {
  validatePassword,
  validateUsername,
} from "../../utils/validations.util.js";
import { users } from "../../utils/constants.util.js";
import bcrypt from "bcrypt";
import { UserModel } from "../../models/userModel.js";
import { logger } from "../../utils/logger.util.js";
import jwt from "jsonwebtoken";
import { redis } from "../../connectors/index.js";

//Router
export const router = express.Router();

//register
router.post("/register", async (req, res, next) => {
  try {
    const { username, password, type } = req.body;
    // basic checks
    if (!username) {
      return next(
        new APIError(HTTPStatus.BadRequest, "Missing Field `username`")
      );
    }

    if (!password) {
      return next(
        new APIError(HTTPStatus.BadRequest, "Missing Field `password`")
      );
    }

    // validity checks
    if (!validateUsername(username)) {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          "field `username` should be more than 6 characters in length"
        )
      );
    }

    if (!validatePassword(password)) {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          "password should be >= 6 characters in length and must include atleast one lowercase, one uppercase and on number. eg: Test123"
        )
      );
    }

    if (!users.includes(type)) {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          `property \`type\` should be only one of ${users}`
        )
      );
    }

    const checkuser = await UserModel.findOne({ username });
    if (checkuser) {
      return next(
        new APIError(HTTPStatus.BadRequest, "user already registered.")
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new UserModel({ username, password: hashedPassword, type });
    await user.save();

    const REDIS_QUERY = "/list-of-sellers/";
    const client = await redis.connectRedis();

    await client.del(REDIS_QUERY);
    logger.info("deleted from redis...");
    res
      .status(HTTPStatus.OK)
      .send({ message: "Registered User Successfully..." });
    return next();
  } catch (error) {
    logger.error("POST /register ", error);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error.")
    );
  }
});

//login
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username) {
      return next(
        new APIError(HTTPStatus.BadRequest, "missing field `username`")
      );
    }
    if (!password) {
      return next(
        new APIError(HTTPStatus.BadRequest, "missing field `password`")
      );
    }

    const user = await UserModel.findOne({ username: username });
    if (!user) {
      return next(new APIError(HTTPStatus.BadRequest, "User not registered."));
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return next(new APIError(HTTPStatus.Unauthorized, "Invalid Password."));
    }

    if (!process.env.JWT_SECRET) {
      return next(
        new APIError(HTTPStatus.InternalServerError, "Internal Server Error.")
      );
    }
    const payload = {
      userId: user._id,
      type: user.type,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: 60 * 60,
    });
    res.send({ message: "succcessfully logged in.", token: token });
    return next();
  } catch (error) {
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error.")
    );
  }
});
