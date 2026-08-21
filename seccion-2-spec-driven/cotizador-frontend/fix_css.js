const fs = require('fs');
const outPath = 'c:/Users/ADMIN/Documents/taller-frontend/index.html';
let html = fs.readFileSync(outPath, 'utf8');
if (html.charCodeAt(0) === 0xFEFF) { html = html.slice(1); }
const oldStyle = /<style>[\s\S]*?<\/style>/;
const newStyle = `<style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    [hidden] { display: none !important; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 15px; line-height: 1.5; color: #1a1a1a; background-color: #f5f5f5;
      min-height: 100vh; overflow-x: hidden;
    }
    header { background-color: #1e3a5f; color: #ffffff; padding: 0.75rem 1rem; }
    header h1 { font-size: 1.25rem; font-weight: 600; max-width: 800px; margin: 0 auto; width: 100%; }
    main {
      max-width: 800px; margin: 0 auto; width: 100%;
      display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      gap: 1.5rem; padding: 1.25rem 1rem; align-items: start;
    }
    #cotizador-form { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
    fieldset {
      border: none; background-color: #ffffff; border-radius: 8px; padding: 1rem 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04); min-width: 0;
    }
    legend {
      font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.04em;
      color: #555; padding-bottom: 0.75rem; display: block; width: 100%;
    }
    label[for="sel-calzado"] { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; color: #333; }
    #sel-calzado {
      width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;
      background-color: #fff; font-size: 0.9375rem; color: #1a1a1a; cursor: pointer; transition: border-color 0.15s;
    }
    #sel-calzado:focus { outline: 2px solid #2563eb; outline-offset: 1px; border-color: #2563eb; }
    .rep-item { display: flex; align-items: center; gap: 0.625rem; padding: 0.35rem 0; }
    .rep-item + .rep-item { border-top: 1px solid #f0f0f0; }
    .rep-check { width: 1rem; height: 1rem; accent-color: #2563eb; cursor: pointer; flex-shrink: 0; }
    .rep-item label { font-size: 0.9375rem; cursor: pointer; flex: 1; min-width: 0; }
    #fs-urgencia label { display: flex; align-items: center; gap: 0.625rem; cursor: pointer; font-size: 0.9375rem; }
    #chk-urgencia { width: 1rem; height: 1rem; accent-color: #d97706; flex-shrink: 0; }
    #btn-cotizar {
      align-self: flex-start; padding: 0.625rem 2rem; background-color: #2563eb; color: #ffffff;
      font-size: 1rem; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;
      transition: background-color 0.15s, opacity 0.15s;
    }
    #btn-cotizar:hover:not(:disabled) { background-color: #1d4ed8; }
    #btn-cotizar:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
    #btn-cotizar:disabled { opacity: 0.4; cursor: not-allowed; }
    #mensaje-error {
      background-color: #fef2f2; color: #b91c1c; border-left: 4px solid #ef4444;
      border-radius: 4px; padding: 0.625rem 0.875rem; font-size: 0.9rem; font-weight: 500;
    }
    #desglose {
      background-color: #ffffff; border-radius: 8px; padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
      display: flex; flex-direction: column; gap: 0.875rem; min-width: 0;
    }
    #desglose h2 { font-size: 1rem; font-weight: 700; color: #1e3a5f; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    #indicador-stale {
      background-color: #fffbeb; color: #92400e; border: 1px solid #fcd34d;
      border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 0.875rem; font-weight: 500;
    }
    #desglose-lista { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; }
    #desglose-lista li {
      display: flex; justify-content: space-between; align-items: baseline;
      font-size: 0.9375rem; padding: 0.3rem 0; border-bottom: 1px solid #f3f4f6; color: #374151;
    }
    #desglose p { font-size: 0.9375rem; color: #4b5563; display: flex; justify-content: space-between; }
    #desglose p:last-child { border-top: 2px solid #e5e7eb; padding-top: 0.5rem; margin-top: 0.25rem; }
    #desglose p:last-child strong { font-size: 1.1rem; color: #1e3a5f; }
    @media (max-width: 640px) {
      main { grid-template-columns: 1fr; padding: 1rem; gap: 1rem; }
    }
  </style>`;
html = html.replace(oldStyle, newStyle);
fs.writeFileSync(outPath, html, { encoding: 'utf8' });
const verify = fs.readFileSync(outPath, 'utf8');
const checks = {
  'no BOM': verify.charCodeAt(0) !== 0xFEFF,
  'overflow-x hidden': verify.includes('overflow-x: hidden'),
  'max-width 800px': verify.includes('max-width: 800px'),
  'no float left': !verify.includes('float: left'),
  'legend display block': verify.includes('display: block'),
  'responsive 640px': verify.includes('max-width: 640px'),
  'min-width 0': verify.includes('min-width: 0'),
};
let allOk = true;
for (const [k,v] of Object.entries(checks)) {
  console.log((v ? 'OK' : 'FAIL') + ' - ' + k);
  if (!v) allOk = false;
}
console.log(allOk ? '\nAll checks passed' : '\nSome checks failed');