document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const petNameInput = document.getElementById("pet-name");
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("preview");
  const previewContainer = document.getElementById("preview-container");
  const uploadText = document.getElementById("upload-text");
  const generateBtn = document.getElementById("generate-btn");
  const loading = document.getElementById("loading");
  const loadingQuip = document.getElementById("loading-quip");
  const inputSection = document.getElementById("input-section");
  const resultSection = document.getElementById("result-section");
  const resultImage = document.getElementById("result-image");
  const petNameLabel = document.getElementById("pet-name-label");
  const generationsCounter = document.getElementById("generations-counter");
  const pawtraitContainer = document.querySelector(".pawtrait-container");

  // Loading quips
  const loadingQuips = [
    "Polishing those whiskers...",
    "Sniffing out details...",
    "Fluffing up fur...",
    "Polishing toe beans...",
    "Final tail touches...",
    "Stroking those whiskers...",
    "Calibrating cuteness...",
    "Importing belly rubs...",
    "Processing paw prints...",
    "Adding extra fluff...",
    "Loading zoomies...",
    "Adjusting ear flops...",
    "Applying nose shine...",
  ];

  let currentQuipIndex = -1;
  let quipInterval = null;

  // Function to get next quip sequentially
  const getNextQuip = () => {
    if (currentQuipIndex === -1) {
      // First time: start at random position
      currentQuipIndex = Math.floor(Math.random() * loadingQuips.length);
    } else {
      // Move to next quip
      currentQuipIndex = (currentQuipIndex + 1) % loadingQuips.length;
    }
    return loadingQuips[currentQuipIndex];
  };

  // Function to update quip with fade
  const updateQuip = () => {
    loadingQuip.classList.add("fade");

    setTimeout(() => {
      loadingQuip.textContent = getNextQuip();
      loadingQuip.classList.remove("fade");
    }, 300); // Half the fade duration to ensure smooth transition
  };

  // Function to start quip rotation
  const startQuipRotation = () => {
    // Reset index to start fresh
    currentQuipIndex = -1;

    // Set initial quip
    loadingQuip.textContent = getNextQuip();

    // Start rotation interval
    quipInterval = setInterval(updateQuip, 4000);
  };

  // Function to stop quip rotation
  const stopQuipRotation = () => {
    if (quipInterval) {
      clearInterval(quipInterval);
      quipInterval = null;
      currentQuipIndex = -1; // Reset for next time
    }
  };

  // State
  let selectedFile = null;
  let petName = "";

  // Reset preview state
  const resetPreview = () => {
    selectedFile = null;
    preview.src = "";
    preview.classList.add("hidden");
    uploadText.classList.remove("hidden");
    dropZone.classList.remove("has-image");
    previewContainer.classList.remove("visible");
    generateBtn.disabled = true;
  };

  // Handle pet name input
  petNameInput.addEventListener("input", (e) => {
    petName = e.target.value.trim();
  });

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    selectedFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
      uploadText.classList.add("hidden");
      dropZone.classList.add("has-image");

      // Reset animation state
      previewContainer.classList.remove("visible");

      // Trigger animation after a brief delay
      setTimeout(() => {
        previewContainer.classList.add("visible");
      }, 50);

      generateBtn.disabled = false;
    };

    reader.readAsDataURL(file);
  };

  // File input change handler
  fileInput.addEventListener("change", (e) => {
    handleFileSelect(e.target.files[0]);
  });

  // Drag and drop handlers
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--primary-color)";
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border)";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border)";
    handleFileSelect(e.dataTransfer.files[0]);
  });

  // Download handler for generated image
  pawtraitContainer.addEventListener("click", async () => {
    if (!resultImage.src) return;

    try {
      // For base64 images, we can create the blob directly
      const base64Data = resultImage.src.split(",")[1];
      const blob = await (await fetch(resultImage.src)).blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pawtrait${petName ? `-${petName}` : ""}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading image:", error);
      alert("Failed to download image");
    }
  });

  // Check initial generations count
  const updateGenerationsCount = async () => {
    try {
      const response = await fetch("/api/remaining");
      const data = await response.json();
      generationsCounter.textContent = `${data.remaining} generations left...`;
    } catch (error) {
      console.error("Error fetching remaining generations:", error);
    }
  };

  // Update generations count on load
  updateGenerationsCount();

  // Generate button click handler
  generateBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    // Start fade out animation for all content
    document.querySelector(".container").classList.add("loading-active");
    document.querySelector(".header").classList.add("loading-active");
    inputSection.classList.add("fade-out");

    // Wait for fade out to complete before showing loading
    setTimeout(() => {
      inputSection.classList.add("hidden");
      loading.classList.remove("hidden");
      startQuipRotation(); // Start quip rotation when loading shows
    }, 1000);

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("petName", petName);

    console.log("Uploading file:", {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
    });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Reset preview state for next use
        resetPreview();

        // Stop quip rotation and hide loading
        stopQuipRotation();
        loading.classList.add("hidden");

        // Update header text based on pet name
        const mainTitle = document.querySelector(".main-title");
        mainTitle.textContent = petName.trim()
          ? `Pawfect, ${petName}!`
          : "Pawfect!";

        // Hide subtitle
        document.querySelector(".subtitle-container").classList.add("hidden");

        // Show and animate header
        document.querySelector(".header").classList.remove("loading-active");
        document.querySelector(".container").classList.remove("loading-active");

        // Show result section
        resultSection.classList.remove("hidden");

        // Set up the result image with base64 data
        resultImage.src = data.url;

        // Update generations counter
        generationsCounter.textContent = `${data.remaining} generations left...`;

        // Wait for image to load before showing
        resultImage.onload = () => {
          // Force a reflow to ensure animations trigger
          resultSection.offsetHeight;

          // Trigger fade in animations
          resultSection.classList.add("visible");

          // Show pet name if provided
          if (petName) {
            petNameLabel.textContent = petName;
            petNameLabel.classList.remove("hidden");
            setTimeout(() => {
              petNameLabel.classList.add("visible");
            }, 100);
          }
        };
      } else {
        throw new Error(data.error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.message);
      // Reset UI state
      stopQuipRotation(); // Stop quip rotation on error
      inputSection.classList.remove("fade-out", "hidden");
      loading.classList.add("hidden");
      document.querySelector(".container").classList.remove("loading-active");
      document.querySelector(".header").classList.remove("loading-active");
      generateBtn.disabled = false;
    }
  });
});
