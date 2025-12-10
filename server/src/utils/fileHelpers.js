const fs = require('fs');
const path = require('path');

const resolveAbsolutePath = (publicPath) => path.join(__dirname, '..', '..', publicPath);

const readTextFile = async (publicPath) => {
  const absolutePath = resolveAbsolutePath(publicPath);
  const buffer = await fs.promises.readFile(absolutePath);
  return buffer.toString('utf-8');
};

const writeTextFile = async (publicPath, content) => {
  const absolutePath = resolveAbsolutePath(publicPath);
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, content, 'utf-8');
  return publicPath;
};

const buildFTxtPath = (textPath, baseName) => {
  const dir = path.dirname(textPath).replace(/\\/g, '/');
  const safeBase = baseName.replace(/[^\w.-]/g, '_');
  return `${dir}/${safeBase}.F.txt`;
};

module.exports = { resolveAbsolutePath, readTextFile, writeTextFile, buildFTxtPath };


