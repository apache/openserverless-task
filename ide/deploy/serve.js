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

import {stat} from "fs/promises";
import {resolve, extname} from "path";
import {lookup as lookupMime} from 'mime-types';
import {parse} from "url";
import process from 'process';
import { file } from "bun";

/**
 * Helper function to find the first available port starting from 8080
 * @param host
 * @param startPort
 * @returns {Promise<number>}
 */
async function findAvailablePort(host, startPort = 8080) {
    host = host || '127.0.0.1';
    for (let port = startPort; port < 65535; port++) {
        try {
            const server = Bun.listen({
                host: host,
                port: port,
                socket: {
                    data(socket, data) {
                    },
                }
            });
            server.stop(); // Close immediately if successful
            return port;
        } catch (e) {
            // Port is taken, try the next one
        }
    }
    throw new Error("❌ No available port found.");
}

/**
 * Helper function thath convert the input stream to a Buffer
 * @param stream
 * @returns {Promise<Buffer<ArrayBuffer>>}
 */
async function toBuffer(stream) {
    // If there's no body (e.g. OPTIONS requests or empty bodies), return null
    if (!stream) return null;

    // Some runtimes provide a ReadableStream with getReader(), others may give a Node-style stream
    if (typeof stream.getReader === 'function') {
        const list = [];
        const reader = stream.getReader();
        while (true) {
            const {value, done} = await reader.read();
            if (value)
                list.push(value);
            if (done)
                break;
        }
        return Buffer.concat(list);
    }

    // If it's already a Buffer or ArrayBuffer-like
    if (Buffer.isBuffer(stream)) return stream;
    if (stream instanceof ArrayBuffer) return Buffer.from(new Uint8Array(stream));

    // If it's an async iterator (Node readable), consume it
    if (stream[Symbol.asyncIterator]) {
        const list = [];
        for await (const chunk of stream) {
            list.push(Buffer.from(chunk));
        }
        return Buffer.concat(list);
    }

    // Unknown type: try to stringify
    try {
        const s = String(stream);
        return Buffer.from(s, 'utf8');
    } catch (e) {
        return null;
    }

}

//
/**
 * Helper function to determine MIME type based on file extension
 * @param filePath
 * @returns {*|string}
 */
function getMimeType(filePath) {
    // Use the mime-types package to resolve mimetypes for a broad set of extensions.
    // Fallback to application/octet-stream when unknown.
    const m = lookupMime(filePath);
    return m || "application/octet-stream";
}

const excludedAssets = ['favicon.ico'];

/**
 * Entry point. This will start a web server on the first available port
 * starting from 8080. When the file ot serve is not local and a proxy host
 * is specified by the `-P flag`, the request will be sent to the proxy host
 * and the response returned back.
 *
 * @returns {Promise<Response>}
 */
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
                const fileStats = await stat(filePath);

                if (fileStats.isFile()) {
                    const mimeType = flags.mimeType || getMimeType(filePath);

                    // Compute caching headers
                    const lastModified = fileStats.mtime.toUTCString();
                    // Simple ETag based on inode/size/mtime if available
                    const etag = `W/"${fileStats.size}-${fileStats.mtimeMs}"`;

                    // Handle conditional requests
                    const ifNoneMatch = req.headers.get('if-none-match');
                    const ifModifiedSince = req.headers.get('if-modified-since');
                    if (ifNoneMatch && ifNoneMatch === etag) {
                        return new Response(null, {status: 304, headers: {"ETag": etag}});
                    }
                    if (ifModifiedSince) {
                        const since = new Date(ifModifiedSince);
                        if (!isNaN(since.getTime()) && fileStats.mtime <= since) {
                            return new Response(null, {status: 304, headers: {"Last-Modified": lastModified, "ETag": etag}});
                        }
                    }

                    const headers = {
                        "Content-Type": mimeType,
                        "Content-Length": String(fileStats.size),
                        "Last-Modified": lastModified,
                        "ETag": etag,
                    };
                    if (flags.cacheTime) {
                        headers["Cache-Control"] = `max-age=${flags.cacheTime}`;
                    }
                    console.log(`[200] - Serving file ${pathname} from filesystem`);
                    // Stream the file to avoid loading the whole file into memory
                    // Bun.file(filePath).stream() returns a ReadableStream
                    try {
                        const stream = Bun.file(filePath).stream();
                        return new Response(stream, {headers});
                    } catch (e) {
                        // Fallback: read as arrayBuffer if stream isn't available
                        const ab = await Bun.file(filePath).arrayBuffer();
                        return new Response(ab, {headers});
                    }
                }
            } catch (err) {
                let shouldExclude = (excludedAssets.indexOf(pathname) !== -1);

                // File not found, fall back to proxy
                if (flags.proxyHost && !shouldExclude) {
                    const destProxyUrl = `${flags.proxyHost}${pathname}`;

                    console.log(`[ P ] - Proxying request ${req.method} to '${destProxyUrl}'`);
                    const newHeaders = JSON.parse(JSON.stringify(req.headers));

                    const excludedHeaders = [
                        'host', 'origin',
                        // 'accept-encoding',
                        'sec-fetch-mode', 'sec-fetch-dest', 'sec-ch-ua',
                        'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-fetch-site'
                    ];

                    for (const header of excludedHeaders) {
                        delete newHeaders[header];
                    }

                    const init = {
                        method: req.method,
                        headers: newHeaders,
                    };
                    // Only forward a body when the method permits it and a body exists
                    const method = req.method.toLowerCase();
                    const canHaveBody = (method !== 'get' && method !== 'head' && method !== 'options');
                    if (canHaveBody && req.body) {
                        const buf = await toBuffer(req.body);
                        if (buf && buf.length > 0) {
                            // prefer sending string when it's valid UTF-8 text
                            let bodyToSend = buf;
                            try {
                                const text = buf.toString('utf8');
                                bodyToSend = text;
                            } catch (e) {
                                bodyToSend = buf;
                            }
                            init['body'] = bodyToSend;
                        }
                    }
                    const respP = await fetch(destProxyUrl, init);
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

    console.log(`🌍 Server running at http://${flags.host}:${serverPort}`);
    if (flags.proxyHost) {
        console.log(`🌍 Server proxying at ${flags.proxyHost}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
