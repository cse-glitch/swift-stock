const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
};

const srcDir = path.join(__dirname, '../src');
const files = walk(srcDir);

files.forEach((file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => !line.trim().startsWith('//'));
    const newContent = filteredLines.join('\n');
    
    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Cleaned: ${file}`);
    }
  } catch (err) {
    console.error(`Failed: ${file}`, err.message);
  }
});
