import mongoose, { model, Schema } from "mongoose";

const UserSchema = new Schema({
  username: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  password: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  type: {
    type: mongoose.Schema.Types.String,
    enum: ["buyer", "seller"],
    required: true,
  },
});

export const UserModel = model("User", UserSchema);
