import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    sellerid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    buyerid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    order: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Item",
    },
  },
  {
    timestamps: true,
  }
);

export const OrderModel = mongoose.model("Order", OrderSchema);
