import mongoose from "mongoose";

const ItemSchema = mongoose.Schema({
  name: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  price: {
    type: mongoose.Schema.Types.Number,
    required: true,
  },
});

export const ItemModel = mongoose.model("Item", ItemSchema);
