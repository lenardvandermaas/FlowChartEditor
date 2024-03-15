import * as webpack from 'webpack';
import { CustomWebpackBrowserSchema, TargetOptions } from '@angular-builders/custom-webpack';

export default (
  config: webpack.Configuration,
  options: CustomWebpackBrowserSchema,
  targetOptions: TargetOptions) =>
{
  if (config.module && config.module.rules) {
    config.module.rules.push({
      test: /\.css$/i,
      loader: "css-loader"
    });
  }
  return config;
}
