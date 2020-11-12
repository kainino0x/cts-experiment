/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/ // Node can look at the filesystem, but JS in the browser can't.
// This crawls the file tree under src/suites/${suite} to generate a (non-hierarchical) static
// listing file that can then be used in the browser to load the modules containing the tests.
import * as fs from 'fs';import * as path from 'path';



import { assert, unreachable } from '../framework/util/util.js';

const fg = require('fast-glob');

const specFileSuffix = '.spec.ts';

export async function crawl(suite) {
  const suiteDir = 'src/' + suite;
  if (!fs.existsSync(suiteDir)) {
    console.error(`Could not find ${suiteDir}`);
    process.exit(1);
  }

  const glob = `${suiteDir}/**/{README.txt,*${specFileSuffix}}`;
  const filesToEnumerate = await fg(glob, { onlyFiles: true });
  filesToEnumerate.sort();

  const entries = [];
  for (const file of filesToEnumerate) {
    const f = file.substring((suiteDir + '/').length); // Suite-relative file path
    if (f.endsWith(specFileSuffix)) {
      const filepathWithoutExtension = f.substring(0, f.length - specFileSuffix.length);
      const filename = `../../../${suiteDir}/${filepathWithoutExtension}.spec.js`;

      const mod = await import(filename);
      assert(mod.description !== undefined, 'Test spec file missing description: ' + filename);
      assert(mod.g !== undefined, 'Test spec file missing TestGroup definition: ' + filename);

      mod.g.validate();

      const path = filepathWithoutExtension.split('/');
      entries.push({ file: path, description: mod.description.trim() });
    } else if (path.basename(file) === 'README.txt') {
      const filepathWithoutExtension = f.substring(0, f.length - '/README.txt'.length);
      const readme = fs.readFileSync(file, 'utf8').trim();

      const path = filepathWithoutExtension ? filepathWithoutExtension.split('/') : [];
      entries.push({ file: path, readme });
    } else {
      unreachable(`glob ${glob} matched an unrecognized filename ${file}`);
    }
  }

  return entries;
}

export function makeListing(filename) {
  const suite = path.basename(path.dirname(filename));
  return crawl(suite);
}
//# sourceMappingURL=crawl.js.map