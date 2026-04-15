const sharp = require('sharp');
const fs = require('fs');

const sizes = [192, 512];
const outputDir = './public/icons';

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

sizes.forEach(size => {
  sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 10, g: 37, b: 64, alpha: 1 } // navy blue
    }
  })
    .png()
    .toFile(`${outputDir}/icon-${size}.png`)
    .then(() => console.log(`Created icon-${size}.png`))
    .catch(err => console.error(err));
});