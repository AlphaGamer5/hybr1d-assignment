import jwt from "jsonwebtoken";
import { APIError, HTTPStatus } from "../../utils/apierror.util.js";

export const auth = (req, res, next) => {
  const token = req.headers && req.headers["x-user-auth-token"];
  if (!token) {
    return next(new APIError(HTTPStatus.BadRequest, "Invalid token."));
  }
  if (!process.env.JWT_SECRET) {
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error.")
    );
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return next(new APIError(HTTPStatus.Unauthorized, "Invalid Token."));
    }

    if (payload && !payload.userId) {
      return next(new APIError(HTTPStatus.Unauthorized, "Invalid User."));
    }

    req.userId = payload.userId;
    req.type = payload.type;
    return next();
  });
};
