import { APIError, HTTPStatus } from "../../utils/apierror.util.js";

export const handle404 = (req, res, next) => {
  if (res.headersSent) {
    next();
    return;
  }

  next(
    new APIError(
      HTTPStatus.NotFound,
      "Route not found or method not supported."
    )
  );
};
