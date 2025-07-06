module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'node-pty') {
        pkg.requiresBuild = true;
      }
      return pkg;
    }
  }
};