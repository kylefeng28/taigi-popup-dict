const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories and files to copy as-is into dist/
const staticAssets = [
    'css',
    'data',
    'images',
    'js',
    'manifest.json',
    'options.html',
    'wordlist.html',
    'help.html',
    'offscreen.html',
];

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

function cleanDist() {
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true });
    }
    fs.mkdirSync('dist', { recursive: true });
}

function copyStaticAssets() {
    for (const asset of staticAssets) {
        const src = path.resolve(asset);
        const dest = path.resolve('dist', asset);
        if (!fs.existsSync(src)) {
            console.warn(`Warning: ${asset} not found, skipping.`);
            continue;
        }
        copyRecursive(src, dest);
    }

    // gzip large dictionary file
    execSync('gzip dist/data/dict-twblg.json');
    execSync('gzip dist/data/dict-twblg-ext.json');
}

async function buildOrWatch(buildOptions, watch) {
  if (watch) {
    // Use esbuild context API to start a persistent watch process
    const plugins = [{
      name: 'watch-logger',
      setup(build) {
        let count = 0;
        build.onStart(() => {
          console.log(`[watch] build started for ${buildOptions.entryPoints}...`);
        });
        build.onEnd(result => {
          count++;
          if (result.errors.length > 0) {
            console.log(`[watch] build ${count} failed with ${result.errors.length} errors`);
          } else {
            console.log(`[watch] build ${count} succeeded, outputted to ${buildOptions.outfile}`);
          }
        });
      },
    }];

    let ctx = await esbuild.context({ ...buildOptions, plugins });
    return ctx.watch();
  } else {
    return esbuild.build(buildOptions);
  }
}

async function build(watch) {
    cleanDist();
    copyStaticAssets();

    const allCtxs = [];

    // Service worker (background worker)
    const serviceCtx = buildOrWatch({
        entryPoints: ['src/entry/background.ts'],
        bundle: true,
        outfile: 'dist/background.js',
        format: 'esm',
        target: 'chrome110',
    }, watch);
    allCtxs.push(serviceCtx);

    const scripts = {
      // Content script for popup
      'src/entry/content.ts': 'dist/content.js',
      // Word list script
      'src/lang/chinese/wordlist.ts': 'dist/wordlist.js',
      // Options page
      'src/entry/options.ts': 'dist/options.js',
      // Offscreen document for audio playback
      'src/entry/offscreen.ts': 'dist/offscreen.js',
    };

    for (const [src, outfile] of Object.entries(scripts)) {
      const scriptCtx = buildOrWatch({
          entryPoints: [src],
          bundle: true,
          outfile: outfile,
          format: 'iife',
          target: 'chrome110',
      }, watch);
      allCtxs.push(scriptCtx);
    }

    if (watch) {
      console.log('Watching for file changes...');
    }
    else {
      console.log('Build complete, outputted all files to ./dist/');
    }
}

const watch = process.argv.includes('--watch');
build(watch).catch((err) => {
    console.error(err);
    process.exit(1);
});
