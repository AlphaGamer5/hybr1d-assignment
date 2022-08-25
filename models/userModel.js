import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
    type: mongoose.Schema.Types.String,
    unique: true,
    required: true,
  },
  password: {
    type: mongoose.Schema.Types.String,
    required: true,
    minlength: 6,
  },
  type: {
    type: mongoose.Schema.Types.String,
    enum: ["buyer", "seller"],
    required: true,
  },
});

export const UserModel = mongoose.model("User", UserSchema);
