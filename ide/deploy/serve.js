// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import {statSync, readFileSync} from "fs";
import {resolve, extname} from "path";
import {parse} from "url";
import process from 'process';

// Helper function to find the first available port starting from 8080
async function findAvailablePort(host, startPort = 8080) {
    host = host || '127.0.0.1';
    for (let port = startPort; port < 65535; port++) {
        try {
            const server = Bun.listen({
                host: host,
                port: port,
                socket: { data(socket, data) { }, }
            });
            server.stop(); // Close immediately if successful
            return port;
        } catch (e) {
            // Port is taken, try the next one
        }
    }
    throw new Error("No available port found.");
}

// Helper function to determine MIME type based on file extension
function getMimeType(filePath) {
    const ext = extname(filePath).toLowerCase();
    const mimeTypes = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".txt": "text/plain",
        // Add more mimetypes as needed
    };
    return mimeTypes[ext] || "application/octet-stream";
}

const excludedAssets = ['favicon.ico'];

async function main() {

    // Get command-line arguments
    const args = Bun.argv.slice(2);
    const flags = {
        port: 8080,
        host: "127.0.0.1",
        dir: "./",
        proxyHost: null,
        cacheTime: null,
        mimeType: null,
    };

// Parse command-line flags
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "-h":
                flags.host = args[i + 1];
                i++;
                break;
            case "-d":
                flags.dir = args[i + 1];
                i++;
                break;
            case "-P":
                flags.proxyHost = args[i + 1];
                i++;
                break;
            case "-c":
                flags.cacheTime = parseInt(args[i + 1], 10) || null;
                i++;
                break;
            case "--mimetype":
                flags.mimeType = args[i + 1];
                i++;
                break;
        }
    }

    const assetsDirectory = resolve(flags.dir);
    const serverPort = await findAvailablePort(flags.host, flags.port);

    Bun.serve({
        port: serverPort,
        hostname: flags.host,
        async fetch(req) {
            const {pathname} = parse(req.url);
            const filePath = `${assetsDirectory}${pathname === "/" ? "/index.html" : pathname}`;
            // Check if file exists locally
            try {
                // console.debug(`Asset dir: ${assetsDirectory} - Filepath is ${filePath}`);
                const fileStats = statSync(filePath);

                if (fileStats.isFile()) {
                    const mimeType = flags.mimeType || getMimeType(filePath);
                    const headers = {
                        "Content-Type": mimeType,
                    };
                    if (flags.cacheTime) {
                        headers["Cache-Control"] = `max-age=${flags.cacheTime}`;
                    }
                    console.log(`[200] - Serving file ${pathname} from filesystem`);
                    return new Response(readFileSync(filePath), {headers});
                }
            } catch (err) {
                let shouldExclude = (excludedAssets.indexOf(pathname) !== -1);

                // File not found, fall back to proxy
                if (flags.proxyHost && !shouldExclude) {
                    const destProxyUrl = `${flags.proxyHost}${pathname}`;

                    console.log(`[ P ] - Proxying request ${req.method} to '${destProxyUrl}'`);
                    const newHeaders = JSON.parse(JSON.stringify(req.headers));
                    if (Object.keys(newHeaders).indexOf('host')) {
                        delete newHeaders['host'];
                    }
                    if (Object.keys(newHeaders).indexOf('origin')) {
                        delete newHeaders['origin'];
                    }
                    if (Object.keys(newHeaders).indexOf('referer')) {
                        delete newHeaders['referer'];
                    }
                    console.log(JSON.stringify(Object.keys(newHeaders)));
                    const respP = await fetch(destProxyUrl, {
                        method: req.method,
                        //headers: newHeaders,
                        //body: req.body
                    });
                    console.log(`[${respP.status}] - Sending response with status ${respP.statusText}`);

                    return respP;
                } else {
                    console.log(`[404] - File ${pathname} not found`);
                    return new Response("File not found", {status: 404});
                }
            }
        },
        error(e) {
            console.error("Error occurred:", e);
            return new Response("Internal Server Error", {status: 500});
        },
    });

    console.log(`Server running at http://${flags.host}:${serverPort}`);
    if (flags.proxyHost) {
        console.log(`Server proxying at ${flags.proxyHost}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
