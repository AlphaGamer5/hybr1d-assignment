import express from "express";
import { logger } from "../../utils/logger.util.js";
import { ItemModel } from "../../models/itemModel.js";
import { CatalogModel } from "../../models/catalogModel.js";
import { APIError, HTTPStatus } from "../../utils/apierror.util.js";
import { auth } from "../../middlewares/auth/auth.middleware.js";
import mongoose from "mongoose";
import { OrderModel } from "../../models/orderModel.js";

export const router = express.Router();

router.post("/create-catalog", auth, async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !items.length) {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          "invalid list of `items`. please provide a valid list of `items`."
        )
      );
    }
    const { userId, type } = req;

    if (type !== "seller") {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          "only seller is allowed to create a catalog."
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

    const catalog = await CatalogModel.updateMany(
      {
        sellerid: userId,
      },
      {
        sellerid: userId,
        items: itemids,
      },
      {
        upsert: true,
      }
    );

    console.log(catalog);
    res.send("successfully created.");
    return next();
  } catch (error) {
    logger.error("POST /api/auth/create-catalog", error.message);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error")
    );
  }
});

router.get("/orders", auth, async (req, res, next) => {
  const { userId } = req;

  const data = await OrderModel.aggregate({});
});
