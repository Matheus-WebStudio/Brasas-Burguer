const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp"
};

http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const type = types[path.extname(file)];
  const validPath = /^\/(?:assets\/)?[a-z\d_.-]+$/i.test(file);
  if (!type || !validPath) {
    response.writeHead(404).end("Arquivo não encontrado");
    return;
  }
  fs.readFile(path.join(__dirname, file.slice(1)), (error, data) => {
    if (error) response.writeHead(404).end("Arquivo não encontrado");
    else response.writeHead(200, { "Content-Type": type, "X-Content-Type-Options": "nosniff" }).end(data);
  });
}).listen(8000, "localhost", () => {
  console.log("Site: http://localhost:8000/index.html");
  console.log("Painel: http://localhost:8000/admin.html");
});
