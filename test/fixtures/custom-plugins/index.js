import test, { param } from './imported'
import data from './src/data.toml'

class YourHalo {
  static returnSomething() {
    return 'something'
  }
}

new YourHalo()

data.text.p.toLowerCase()
test(param)

document.getElementById('app').style.cssText = ''