const fs = require('fs');
const http = require('http');
const app = require('fibjs-fibx')();
const router = require('fibjs-fibx-router')({
    fixSlash: true,
    simulation: true,
    size: 200
});
const config = require('../config');

router.get('/favicon.ico', function(){
    this.type = 'image/png';
    this.body = fs.open(`${__dirname}/static/images/logo.png`);
});
router.get('/ms', function(){
    this.body = fs.readFile(`${__dirname}/page/index.html`);
});

app.use('^/static/(.*)', http.fileHandler(`${__dirname}/static`));
app.use('/', router.getAllRoute());
app.listen(config.port.server);