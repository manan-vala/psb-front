const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\manan\\.gemini\\antigravity\\brain\\eeef854e-95c3-40ff-affa-84937d43368a\\.system_generated\\steps\\218\\content.md', 'utf8');
let start = content.indexOf('<svg');
let end = content.indexOf('</svg>') + 6;
if (start !== -1 && end > start) {
  let svg = content.substring(start, end);
  svg = svg.replace(/xmlns:xlink/g, 'xmlnsXlink');
  svg = svg.replace(/class="/g, 'className="');
  svg = svg.replace(/<svg\s+version="1.1"/g, '<svg {...props} version="1.1"');
  svg = svg.replace(/width="784.077px"/g, '');
  svg = svg.replace(/height="458.627px"/g, '');
  const component = `import React from 'react';\nexport function WorldMap(props: React.SVGProps<SVGSVGElement>) {\n  return (\n    ${svg}\n  );\n}`;
  fs.writeFileSync('src/components/icons/WorldMap.tsx', component);
  console.log('Done');
} else {
  console.log('No SVG found');
}
