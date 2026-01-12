const bcrypt = require('bcryptjs');
const pass = process.argv[2] || 'Admin@123';

bcrypt
  .hash(pass, 10)
  .then((h) => console.log(h))
  .catch((e) => { console.error(e); process.exit(1); });
