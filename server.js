const Koa = require('koa');
const koaBody = require('koa-body');
const uuid = require('uuid');
const koaStatic = require('koa-static');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Router = require('koa-router');


const app = new Koa();
const public = path.join(__dirname, '/public');
let contentArr = [];

const filesFolder = './public';

app.use(
  koaBody({
    text: true,
    urlencoded: true,
    multipart: true,
    json: true,
  })
);

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*' };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });

    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e; 
    }
  }
 
  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set(
        'Access-Control-Allow-Headers',
        ctx.request.get('Access-Control-Request-Headers')
       );
    }

    ctx.response.status = 204; // No content
  }
});

const router = new Router();

router.get('/contentArr', async (ctx, next) => {
  contentArr = [];
  fs.readdirSync(filesFolder).forEach(file => {
    contentArr.push({id: uuid.v4(), name: file});
  });
  ctx.response.body = contentArr;
});

app.use(router.routes()).use(router.allowedMethods());
http.createServer(app.callback()).listen(process.env.PORT || 7091);
app.use(koaStatic(public));

app.use(async ctx => {
  const { name } = ctx.request;
  const { file } = ctx.request.files;

  const link = await new Promise((resolve, reject) => { 
    const oldPath = file.path;
    const fileName = uuid.v4();
    const newPath = path.join(public, fileName);

    const callback = (error) => reject(error);

    const readStream = fs.createReadStream(oldPath);
    const writeStream = fs.createWriteStream(newPath);

    readStream.on('error', callback);
    writeStream.on('error', callback);

    readStream.on('close', () => {
      console.log('close');
      fs.unlink(oldPath, callback);
      resolve(fileName);
    });

    readStream.pipe(writeStream);
  });

  ctx.response.body = link;
});
