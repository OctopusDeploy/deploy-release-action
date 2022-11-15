import { dirSync, setGracefulCleanup } from 'tmp'

setGracefulCleanup()
const tmpdir = dirSync({ template: 'deploy-release-XXXXXX' })

process.env = Object.assign(process.env, {
  GITHUB_ACTION: '1',
  INPUT_SERVER: process.env['OCTOPUS_URL'],
  INPUT_API_KEY: process.env['OCTOPUS_API_KEY'],
  INPUT_SPACE: 'Default',
  INPUT_VERSION_NUMBER: '1.0.0',
  INPUT_USE_GUIDED_FAILURE: false,
  INPUT_VARIABLES: ' foo: quux \n bar: xyzzy \n '
})
