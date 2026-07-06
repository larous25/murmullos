import Koa from 'koa';
import serve from 'koa-static';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { snsp } from './sockets.ts'
import Router from '@koa/router';
import multer from '@koa/multer';
import fs from 'fs';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return 'localhost';
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Koa();
const router = new Router();

const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

/* static files */
app.use(serve(path.join(__dirname, '../front')));
app.use(serve(path.join(__dirname, '../front/static')));


app.use(router.routes());
app.use(router.allowedMethods());

router.post(
  '/upload',
  upload.single('file'),
  async (ctx) => {
    const file = ctx.file;

    if (!file) {
      ctx.status = 400;
      ctx.body = { error: 'No file uploaded' };
      return;
    }

    ctx.body = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`
    };
  }
);

router.get('/uploads/:filename', async (ctx) => {
  const filename = ctx.params.filename;
  console.log(`Solicitud de descarga para el archivo: ${filename}`);
  if(!filename) {
    ctx.status = 400;
    ctx.body = 'Nombre de archivo no proporcionado';
    return;
  }

  const filePath = path.join(__dirname, '../../uploads', filename);
  console.log(`Ruta del archivo: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.body = 'Archivo no encontrado';
    return;
  }

  ctx.attachment(filename); // Fuerza la descarga
  ctx.body = fs.createReadStream(filePath);
});

/* servidor http */
const server = http.createServer(app.callback());
server.listen(Number(process.env.PORT) || 3000);

/* mini-logger */
server
  .on('listening', () => {


    console.log('-----------------------');
    console.log('server is running');

      console.log(`http://${getLocalIp()}:${Number(process.env.PORT) || 3000}`);

    console.log('-----------------------');
  })
  .on('connection', () => {
    console.log('new connection');
  })
  .on('request', (req) => {
    console.log(`request to ${req.url} - ${req.method}`);
  });

const serverIo = new Server(server);

snsp(serverIo)