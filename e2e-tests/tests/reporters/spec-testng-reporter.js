const fs = require('fs');
const path = require('path');
const Mocha = require('mocha');

const Spec = Mocha.reporters.Spec;

class SpecTestNGReporter extends Spec {
  constructor(runner, options) {
    super(runner, options);

    runner.once('end', () => {
      const stats = this.stats || runner.stats || {};
      const total = Number(stats.tests || 0);
      const failed = Number(stats.failures || 0);
      const skipped = Number(stats.pending || 0);
      const passed = Number(stats.passes || Math.max(0, total - failed - skipped));

      const outputDir = path.join(process.cwd(), 'test-output');
      const outputPath = path.join(outputDir, 'testng-results.xml');
      fs.mkdirSync(outputDir, { recursive: true });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testng-results total="${total}" passed="${passed}" failed="${failed}" skipped="${skipped}">
</testng-results>
`;

      fs.writeFileSync(outputPath, xml, 'utf8');
      console.log(`[E2E] Wrote TestNG XML: ${outputPath}`);
    });
  }
}

module.exports = SpecTestNGReporter;
