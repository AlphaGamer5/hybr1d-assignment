import express from "express";
import mongoose from "mongoose";
import { auth } from "../../middlewares/auth/auth.middleware.js";
import { OrderModel } from "../../models/orderModel.js";
import { UserModel } from "../../models/userModel.js";
import { ItemModel } from "../../models/itemModel.js";
import { APIError, HTTPStatus } from "../../utils/apierror.util.js";
import { logger } from "../../utils/logger.util.js";
import { validateObjectId } from "../../utils/validations.util.js";
import { CatalogModel } from "../../models/catalogModel.js";
import { redis } from "../../connectors/index.js";

export const router = express.Router();

// buyer apis
router.get("/list-of-sellers", auth, async (req, res, next) => {
  try {
    const { type } = req;
    if (type !== "buyer") {
      return next(
        new APIError(
          HTTPStatus.Unauthorized,
          "Not authorized. please login as a `buyer`."
        )
      );
    }

    const REDIS_QUERY = "/list-of-sellers/";
    const client = await redis.connectRedis();

    let data = await client.get(REDIS_QUERY);
    if (data) {
      logger.info(`fetched from redis...`);
      res.send(JSON.parse(data));
      return next();
    }

    const sellers = (
      await UserModel.aggregate([
        {
          $match: {
            type: "seller",
          },
        },
        {
          $group: {
            _id: null,
            sellers: {
              $push: "$username",
            },
          },
        },
      ])
    )[0];

    if (!sellers) {
      return next(new APIError(HTTPStatus.OK, "No sellers found.."));
    }

    logger.info("fetched from mongodb...");

    await client.set(
      REDIS_QUERY,
      JSON.stringify(sellers.sellers),
      "EX",
      30 * 60
    );

    res.send(sellers.sellers);
    return next();
  } catch (error) {
    logger.error("GET /list-of-sellers", error);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error.")
    );
  }
});

router.get("/seller-catalog/:seller_id", auth, async (req, res, next) => {
  try {
    const { type } = req;
    const { seller_id: sellerId } = req.params;

    if (type !== "buyer") {
      return next(
        new APIError(
          HTTPStatus.Unauthorized,
          "Not authorized. please login as a `buyer`."
        )
      );
    }

    if (!sellerId) {
      return next(
        new APIError(HTTPStatus.BadRequest, "missing param `seller_id`")
      );
    }

    if (!validateObjectId(sellerId)) {
      return next(
        new APIError(HTTPStatus.BadRequest, "Invalid Param `seller_id`.")
      );
    }

    const REDIS_QUERY = "/seller-catalog/" + sellerId;
    const client = await redis.connectRedis();

    let data = await client.get(REDIS_QUERY);
    if (data) {
      logger.info(`fetched from redis...`);
      res.send(JSON.parse(data));
      return next();
    }
    const catalog = (
      await CatalogModel.aggregate([
        {
          $match: {
            sellerid: new mongoose.Types.ObjectId(sellerId),
          },
        },
        {
          $project: {
            items: 1,
            _id: 0,
          },
        },
        {
          $unwind: {
            path: "$items",
          },
        },
        {
          $lookup: {
            from: "items",
            localField: "items",
            foreignField: "_id",
            as: "items",
          },
        },
        {
          $group: {
            _id: null,
            catalog: {
              $push: {
                $arrayElemAt: ["$items.name", 0],
              },
            },
          },
        },
      ])
    )[0];

    if (!catalog) {
      return next(
        new APIError(HTTPStatus.OK, "No catalog found for this seller.")
      );
    }
    logger.info(`fetched from mongodb...`);
    await client.set(
      REDIS_QUERY,
      JSON.stringify(catalog.catalog),
      "EX",
      30 * 60
    );

    res.send(catalog.catalog);
    return next();
  } catch (error) {
    logger.error("GET /seller-catalog/:seller_id", error);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error.")
    );
  }
});

router.post("/create-order/:seller_id", auth, async (req, res, next) => {
  try {
    const { userId, type } = req;
    const { seller_id } = req.params;
    const { items } = req.body;

    if (type !== "buyer") {
      return next(
        new APIError(
          HTTPStatus.Unauthorized,
          "Not authorized. please login as a `buyer`."
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
      await CatalogModel.aggregate([
        {
          $match: {
            sellerid: new mongoose.Types.ObjectId(seller_id),
          },
        },
        {
          $project: {
            __v: 0,
            _id: 0,
            sellerid: 0,
          },
        },
        {
          $addFields: {
            inputitems: items,
          },
        },
        {
          $unwind: {
            path: "$items",
          },
        },
        {
          $lookup: {
            from: "items",
            localField: "items",
            foreignField: "_id",
            as: "item",
          },
        },
        {
          $group: {
            _id: null,
            allitems: {
              $push: {
                $arrayElemAt: ["$item", 0],
              },
            },
            inputitems: {
              $first: "$inputitems",
            },
          },
        },
        {
          $project: {
            notavailable: {
              $setDifference: ["$inputitems", "$allitems.name"],
            },
            presentitems: {
              $filter: {
                input: "$allitems",
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
          `these items are not available in the catalog: **${notAvailable}**.`
        )
      );
    }

    const order = new OrderModel({
      sellerid: seller_id,
      buyerid: userId,
      order: presentItems,
    });

    await order.save();
    res.send("order successfully created...");
    return next();
  } catch (error) {
    logger.error("POST /api/buyer/create-order/:seller_id", error);
    return next(
      new APIError(HTTPStatus.InternalServerError, "Internal Server Error")
    );
  }
});
