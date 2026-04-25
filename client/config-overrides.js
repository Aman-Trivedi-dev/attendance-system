module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    util: require.resolve("util/")
  };
  return config;
};