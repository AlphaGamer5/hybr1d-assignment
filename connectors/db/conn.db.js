import mongoose from "mongoose";

export const connect = async () => {
  try {
    if (!process.env.MONGO_HOST) {
      throw new Error("No port specified for mongodb.");
    }

    const dburl = `mongodb://${process.env.MONGO_HOST}/hybr1d`;

    return mongoose.connect(dburl);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export const disconnect = async () => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.log(error);
  }
};
