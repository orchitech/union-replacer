const requirejs = require('requirejs');

requirejs(['./config'], function () {
  requirejs(['benchmark', 'UnionReplacer', 'Logger'], function () {
    requirejs(['perf'], function (perf) {
      perf.run();
    });
  });
});
