import test, { param } from './imported'
import data from './src/data.md'

class YourHalo {
  static returnSomething() {
    return 'something'
  }
}

new YourHalo()

test(param)

document.getElementById('app').innerHTML = data