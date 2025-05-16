require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Rate limiting setup (in-memory)
const rateLimits = new Map();
const MAX_GENERATIONS = 3;
const UNLIMITED_IPS = ["127.0.0.1", "::1", "192.168.1.195"];

// Helper function to get and clean IP address
const getCleanIp = (req) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress;
  const cleanedIp = ip.replace("::ffff:", "");
  console.log("Detected IP:", cleanedIp);
  return cleanedIp;
};

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting middleware
const checkRateLimit = (req, res, next) => {
  const ip = getCleanIp(req);

  if (UNLIMITED_IPS.includes(ip)) {
    return next();
  }

  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, {
      count: 0,
      remaining: MAX_GENERATIONS,
    });
  }

  const userLimit = rateLimits.get(ip);

  if (userLimit.remaining <= 0) {
    return res.status(429).json({
      error: "You have reached your maximum number of generations.",
      remaining: 0,
    });
  }

  userLimit.count++;
  userLimit.remaining = MAX_GENERATIONS - userLimit.count;
  next();
};

// Remaining generations endpoint
app.get("/api/remaining", (req, res) => {
  const ip = getCleanIp(req);

  if (UNLIMITED_IPS.includes(ip)) {
    return res.json({ remaining: "∞" });
  }

  if (!rateLimits.has(ip)) {
    return res.json({ remaining: MAX_GENERATIONS });
  }

  const userLimit = rateLimits.get(ip);
  return res.json({ remaining: userLimit.remaining });
});

// Generate endpoint
app.post(
  "/api/generate",
  checkRateLimit,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        console.log("No file in request. Request body:", req.body);
        console.log("Request headers:", req.headers);
        return res.status(400).json({ error: "No image file provided" });
      }

      console.log("File received:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      // Convert buffer to OpenAI format
      console.log("Converting file to OpenAI format...");
      const file = await OpenAI.toFile(req.file.buffer, req.file.originalname, {
        type: req.file.mimetype,
      });
      console.log("File converted successfully");

      console.log("Calling OpenAI API...");
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: [file],
        prompt:
          "Transform this pet photo into a premium-quality 3D isometric icon. Focus on smooth but realistic materials—matte plastic, brushed metal, soft-touch silicone, and glass details. Ensure subtle surface textures, gentle reflections, and lifelike imperfections for depth.\n\nApply soft, diffused lighting with clear highlights, ambient occlusion, and natural shadows. Place the subject on a pure white background with a soft ground shadow.\n\nPreserve recognisable pet features like fur, eyes, and posture. Keep the composition clean and minimal, with no background objects, no frames, and no borders. The image should be perfectly square, with the pet as the sole subject centered in the composition.",
      });

      if (!response.data?.[0]?.b64_json) {
        throw new Error("No image data in response");
      }

      // Return the base64 image data directly
      res.json({
        url: `data:image/png;base64,${response.data[0].b64_json}`,
        remaining: UNLIMITED_IPS.includes(getCleanIp(req))
          ? "∞"
          : rateLimits.get(getCleanIp(req)).remaining,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({
        error: "Failed to generate image",
        message: error.message,
      });
    }
  }
);

// Export the Express API
module.exports = app;
