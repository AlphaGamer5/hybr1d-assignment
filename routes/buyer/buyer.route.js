import express from "express";
import mongoose from "mongoose";
import { auth } from "../../middlewares/auth/auth.middleware.js";
import { OrderModel } from "../../models/orderModel.js";
import { UserModel } from "../../models/userModel.js";
import { ItemModel } from "../../models/itemModel.js";
import { APIError, HTTPStatus } from "../../utils/apierror.util.js";
import { logger } from "../../utils/logger.util.js";
import { validateObjectId } from "../../utils/validations.util.js";

export const router = express.Router();

// buyer apis
router.get("/list-of-sellers", (req, res, next) => {
  return res.send("buyer");
});

router.post("/create-order/:seller_id", auth, async (req, res, next) => {
  try {
    const { userId, type } = req;
    const { seller_id } = req.params;
    const { items } = req.body;

    if (type !== "buyer") {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          "only a `buyer` can create an order."
        )
      );
    }

    if (!seller_id) {
      return next(
        new APIError(HTTPStatus.BadRequest, "missing param `seller_id`")
      );
    }

    if (!validateObjectId(seller_id)) {
      return next(
        new APIError(HTTPStatus.BadRequest, "Invalid Param `seller_id`.")
      );
    }

    if (!items) {
      return next(
        new APIError(HTTPStatus.BadRequest, "Missing field (array) `items`.")
      );
    }

    const seller = await UserModel.findOne({
      _id: mongoose.Types.ObjectId(seller_id),
      type: "seller",
    });

    if (!seller) {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          "no seller exists with this `seller_id`. please register yourself as user first"
        )
      );
    }

    const { notavailable: notAvailable, presentitems: presentItems } = (
      await ItemModel.aggregate([
        {
          $project: {
            name: 1,
          },
        },
        {
          $group: {
            _id: null,
            items: {
              $push: {
                _id: "$_id",
                name: "$name",
              },
            },
          },
        },
        {
          $addFields: {
            notavailable: {
              $setDifference: [items, "$items.name"],
            },
            inputitems: items,
          },
        },
        {
          $project: {
            notavailable: 1,
            presentitems: {
              $filter: {
                input: "$items",
                cond: {
                  $in: ["$$this.name", "$inputitems"],
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            notavailable: 1,
            presentitems: {
              $map: {
                input: "$presentitems",
                in: "$$this._id",
              },
            },
          },
        },
      ])
    )[0];

    if (notAvailable.length) {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          `these items are not available in the catalog: ${notAvailable}.`
        )
      );
    }

    const order = new OrderModel({
      sellerid: seller_id,
      buyerid: userId,
      order: presentItems,
    });

    await order.save();
    return res.send("order successfully created...");
  } catch (error) {
    logger.error("POST /api/buyer/create-order/:seller_id", error);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error")
    );
  }
});
