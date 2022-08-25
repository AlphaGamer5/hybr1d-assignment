import { APIError, HTTPStatus } from "../../utils/apierror.util.js";

export const errorHandler = (err, req, res, next) => {
  const status = err.status || HTTPStatus.InternalServerError;
  const data = {
    status,
    message: err.message,
  };

  res.status(status).send(data);
  next();
};
