const os = require('node:os');
os.userInfo = () => ({ username: 'codex', uid: -1, gid: -1, shell: null, homedir: os.homedir() });
require('node:module').syncBuiltinESMExports();
