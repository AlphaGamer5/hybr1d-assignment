import mongoose from "mongoose";

const CatalogSchema = mongoose.Schema(
  {
    sellerid: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: "User",
    },
    items: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Item",
    },
  },
  {
    timestamps: true,
  }
);

export const CatalogModel = mongoose.model("Catalog", CatalogSchema);
