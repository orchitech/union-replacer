define('Logger', function () {
  const root = (typeof global === 'object' && global) || this;

  const logger = {

    log: function (message) {
      if (root.document) {
        root.document.getElementById('log').insertAdjacentHTML('beforeend', message.concat('<br>').replace(/\n/g, '<br>'));
      } else {
        console.log(message);
      }
    },

  };

  return logger;
});
