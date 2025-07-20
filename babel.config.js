module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@tradax/auth': './apps/auth/src',
            '@tradax/home': './apps/home/src',
            '@tradax/wallet': './apps/wallet/src',
            '@tradax/trading': './apps/trading/src',
            '@tradax/news': './apps/news/src',
            '@tradax/ai-chat': './apps/aiChat/src',
            '@tradax/settings': './apps/settings/src',
            '@tradax/theme': './packages/theme/src',
            '@tradax/ui': './packages/ui/src',
            '@tradax/utils': './packages/utils/src',
          },
        },
      ],
    ],
  };
};
