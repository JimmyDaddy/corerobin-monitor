import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../site-dist/", import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname);
    const relativePath = normalize(pathname).replace(/^[/\\]+/, "");
    let target = resolve(root, relativePath);
    if (target !== root && !target.startsWith(`${root}${sep}`)) return respondText(response, 403, "Forbidden");

    try {
      if ((await stat(target)).isDirectory()) target = join(target, "index.html");
    } catch {
      if (!extname(target)) target = join(target, "index.html");
    }

    try {
      await access(target);
    } catch {
      target = join(root, "404.html");
      response.statusCode = 404;
    }

    response.setHeader("Content-Type", contentTypes.get(extname(target).toLowerCase()) ?? "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    createReadStream(target).pipe(response);
  } catch {
    respondText(response, 400, "Bad request");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CoreRobin site preview: http://127.0.0.1:${port}`);
});

function respondText(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}
