import { transform, loadOptions } from '@babel/core'

export default function es5PluginInit() {
  return function es5Plugin(files, ms, done) {
    const isDev = ms.env('NODE_ENV') === 'development'
    const transforms = []
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
    Object.values(files).forEach((file) => {
      if (file.__babelPostProcess) {
        transforms.push(
          new Promise((resolve, reject) => {
            transform(file.contents.toString(), options, (err, result) => {
              if (err) reject(err)
              file.contents = Buffer.from(result.code)
              delete file.__babelPostProcess
              resolve()
            })
          })
        )
      }
    })
    Promise.all(transforms)
      .then(() => done())
      .catch(done)
  }
}
