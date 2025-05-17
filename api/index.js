require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const path = require("path");

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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

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
      error:
        "Thanks for trying Pawtrait, I am funding these myself so need to have a limit, sorry!",
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
          "Transform this pet photo into a premium-quality 3D render, focusing on smooth yet realistic materials such as matte plastic, soft-touch silicone, and brushed metal details. Surfaces should have subtle textures, soft reflections, and lifelike imperfections that add depth and realism.\n\nApply soft, diffused, neutral studio lighting with clear highlights, gentle ambient occlusion, and soft natural shadows. The pet should appear freestanding on a pure white background with only a soft ground shadow beneath them—no tiles, no bases, no props, no isometric angles, and no borders.\n\nEnsure the pet is facing directly toward the camera at eye level, with clean, centered composition. The image should feel like a high-end product render or collectible figurine photo—simple, polished, and focused solely on the pet.\n\nPreserve and enhance recognisable features like fur texture, eye reflections, and authentic posture. The image must be perfectly square, with the pet as the only subject.",
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

// Start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
