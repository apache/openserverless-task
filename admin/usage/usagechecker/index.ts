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

import {logFormatter} from "./log-formatter";
import {volumeManager} from "./volume-manager";
import {jobOperator} from "./job-operator";
import {parseArgs} from "util";

const jobName = "usage-job";
const template = "usage-job.tpl.yaml";

async function main() {
    const options: { debug: { type: 'boolean', default: boolean } } = {
        debug: {
            type: 'boolean',
            default: false
        },
    };
    const {values} = parseArgs({
        args: Bun.argv,
        options: options,
        strict: true,
        allowPositionals: true,
    });

    const volManager = volumeManager('usage', template, values.debug);
    const fmt = logFormatter(values.debug);
    const job = jobOperator(volManager, fmt, values.debug);
    await job.runJob(jobName).catch(console.error).then(dfRows => {
        if (dfRows) {
            console.table(dfRows);
        }
        job.cleanup(jobName);
    });
};

main().then();