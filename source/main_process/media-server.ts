import http, { IncomingMessage, ServerResponse } from 'http';
import { Server as StaticServer } from 'node-static';
let port: number;
let server: any; // eslint-disable-line @typescript-eslint/no-explicit-any
let dir: string;

server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    server.serve(req, res);
}).listen(0, () => port = server.address().port);

function setStaticServeDir(dir: string) {
    server = new StaticServer(dir, { cache: false, indexFile: 'run_index.html' });
}

export default {
    getPort: () => {
        return port;
    },
    getAddr: () => {
        return 'http://127.0.0.1:' + port + '/';
    },
    getDir: () => {
        return dir;
    },
    setDir: (newDir: string) => {
        dir = newDir;
        setStaticServeDir(dir);
    }
};
