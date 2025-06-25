module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@tradax/auth': '../auth/src',
            '@tradax/home': '../home/src',
            '@tradax/wallet': '../wallet/src',
            '@tradax/trading': '../trading/src',
            '@tradax/news': '../news/src',
            '@tradax/ai-chat': '../aiChat/src',
            '@tradax/settings': '../settings/src',
            '@tradax/theme': '../../packages/theme/src',
            '@tradax/ui': '../../packages/ui/src',
            '@tradax/utils': '../../packages/utils/src',
          },
        },
      ],
    ],
  };
};
