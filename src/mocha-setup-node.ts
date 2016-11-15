import * as mocha from 'mocha'

declare const global: any

// inject mocha globally to allow custom interface refer without direct import - bypass bundle issue
global.mocha = mocha
global.Suite = global.mocha.Suite
global.Test = global.mocha.Test
