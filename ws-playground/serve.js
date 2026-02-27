import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 5173
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
}

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url)
    const ext = path.extname(filePath)
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404)
            res.end('Not found')
            return
        }
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(data)
    })
})

server.listen(PORT, () => {
    console.log(`\n🚀 WebSocket Playground corriendo en http://localhost:${PORT}`)
    console.log(`   Backend esperado en http://localhost:3000\n`)
})
