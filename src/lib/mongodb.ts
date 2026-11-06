import mongoose from "mongoose";

const MONGODB_URI = (
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/velox_db"
).trim();

if (!process.env.MONGODB_URI && process.env.NODE_ENV === "production") {
  console.error(
    "❌ MONGODB_URI is not defined in environment variables. Please add it in your Vercel project settings."
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!process.env.MONGODB_URI && process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI is not set. Please add MONGODB_URI in your Vercel project Environment Variables."
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      dbName: "velox_db",
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // 5s timeout instead of hanging 30s
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

