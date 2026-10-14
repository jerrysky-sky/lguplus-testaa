// 빌드 결과(app/dist)를 띄우는 정적 서버. 모르는 경로는 index.html로 돌려 SPA 라우팅을 살린다.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }

export function serve(dist) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      let f = path.join(dist, u)
      if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, 'index.html')
      res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream')
      fs.createReadStream(f).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }))
  })
}
