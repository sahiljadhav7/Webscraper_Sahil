const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { By } = require("selenium-webdriver");

async function downloadImage(driver, title) {
  try {
    const imgElement = await driver.findElement(By.css(".a_m img"));
    const imgUrl = await imgElement.getAttribute("src");
    const imgResponse = await axios.get(imgUrl, { responseType: "stream" });

    const imagesDir = path.join(__dirname, "..", "images");
    await fs.promises.mkdir(imagesDir, { recursive: true });

    const imgName = `${title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}.jpg`;
    const imgPath = path.join(imagesDir, imgName);

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(imgPath);
      imgResponse.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`Downloaded image for: ${title}`);
    return `/images/${imgName}`;
  } catch (error) {
    console.log(`No image for: ${title}`);
    return "";
  }
}

module.exports = { downloadImage };
