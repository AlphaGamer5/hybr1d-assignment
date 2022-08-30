import express from "express";
import { logger } from "../../utils/logger.util.js";
import { ItemModel } from "../../models/itemModel.js";
import { CatalogModel } from "../../models/catalogModel.js";
import { APIError, HTTPStatus } from "../../utils/apierror.util.js";
import { auth } from "../../middlewares/auth/auth.middleware.js";
import mongoose from "mongoose";
import { OrderModel } from "../../models/orderModel.js";
import { redis } from "../../connectors/index.js";

export const router = express.Router();

//seller apis
router.get("/orders", auth, async (req, res, next) => {
  try {
    const { userId, type } = req;
    if (type !== "seller") {
      return next(
        new APIError(
          HTTPStatus.Unauthorized,
          "Not authorized. please login as a `seller`."
        )
      );
    }

    const client = await redis.connectRedis();
    const REDIS_QUERY = "/orders/" + userId;
    let data = await client.get(REDIS_QUERY);
    if (data) {
      logger.info(`fetched from redis...`);
      res.send(JSON.parse(data));
      return next();
    }

    const orders = (
      await OrderModel.aggregate([
        {
          $match: {
            sellerid: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $project: {
            order: 1,
          },
        },
        {
          $unwind: {
            path: "$order",
          },
        },
        {
          $lookup: {
            from: "items",
            localField: "order",
            foreignField: "_id",
            as: "item",
          },
        },
        {
          $project: {
            _id: 1,
            item: {
              $arrayElemAt: ["$item", 0],
            },
          },
        },
        {
          $project: {
            _id: 1,
            item: "$item.name",
          },
        },
        {
          $group: {
            _id: "$_id",
            items: {
              $push: "$item",
            },
          },
        },
        {
          $project: {
            _id: 0,
          },
        },
        {
          $group: {
            _id: null,
            orders: {
              $push: "$items",
            },
          },
        },
        {
          $project: {
            _id: 0,
          },
        },
      ])
    )[0];

    if (!orders) {
      return next(
        new APIError(HTTPStatus.OK, "No orders found for this seller.")
      );
    }

    logger.info("fetched from mongodb...");

    await client.set(REDIS_QUERY, JSON.stringify(orders.orders), "EX", 15 * 60); // min

    res.send({ orders: orders["orders"] });
    return next();
  } catch (error) {
    logger.error("GET /orders", error);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error.")
    );
  }
});

router.post("/create-catalog", auth, async (req, res, next) => {
  try {
    const { items } = req.body;
    const { userId, type } = req;

    if (!items || !items.length) {
      return next(
        new APIError(
          HTTPStatus.BadRequest,
          "invalid list of `items`. please provide a valid list of `items`."
        )
      );
    }

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
            inputitems: items,
          },
        },
        {
          $addFields: {
            notavailable: {
              $setDifference: ["$inputitems", "$items.name"],
            },
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
          `these items are not available for adding in catalog: **${notAvailable}**.`
        )
      );
    }

    const catalog = await CatalogModel.updateMany(
      {
        sellerid: userId,
      },
      {
        sellerid: userId,
        items: presentItems,
      },
      {
        upsert: true,
      }
    );

    // delete the cache stored for /seller-catalog:seller_id as the catalog is updated
    const REDIS_QUERY = "/seller-catalog/" + userId;
    const client = await redis.connectRedis();
    await client.del(REDIS_QUERY);

    res
      .status(HTTPStatus.OK)
      .send({ message: "Created Catalog Successfully." });
    return next();
  } catch (error) {
    logger.error("POST /api/auth/create-catalog", error);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error")
    );
  }
});
