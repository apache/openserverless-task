/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const Minio = require('minio');

async function main(args) {
    console.log(`connecting to ${args.s3_host}:${args.s3_port}`)
    let minioClient = new Minio.Client({
        endPoint: args.s3_host,
        port: parseInt(args.s3_port),
        useSSL: false,
        accessKey: args.s3_access,
        secretKey: args.s3_secret
    });

    let response = {};
    let bucketName = args.s3_data;

    let bucketExists = await minioClient.bucketExists(bucketName);

    if(!bucketExists) {
        response.bucketOperation = await  minioClient.makeBucket(bucketName, 'us-east-1');
    }

    response.buckets = await minioClient.listBuckets();
    return {
        "body": response
    }
}
