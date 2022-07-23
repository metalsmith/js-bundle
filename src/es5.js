import { transform, loadOptions } from '@babel/core'

export default function es5PluginInit() {
  return function es5Plugin(files, ms) {
    const isDev = ms.env('NODE_ENV') === 'development'
    const options = loadOptions({
      envName: ms.env('NODE_ENV'),
      presets: [
        [
          '@babel/preset-env',
          {
            useBuiltIns: 'entry',
            corejs: '3.22'
          }
        ]
      ],
      targets: '> 0.25%, not dead',
      minified: !isDev,
      comments: isDev,
      cwd: ms.directory()
      //inputSourceMap
    })
    const transforms = Object.values(files)
      .filter((file) => file.__babelPostProcess)
      .map(async (file) => {
        const { code } = await transform(file.contents.toString(), options)
        file.contents = Buffer.from(code)
        delete file.__babelPostProcess
      })
    return Promise.all(transforms)
  }
}
