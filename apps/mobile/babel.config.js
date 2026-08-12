module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54) automatically includes the
    // react-native-worklets/plugin required by Reanimated 4.
    presets: ['babel-preset-expo'],
  };
};
