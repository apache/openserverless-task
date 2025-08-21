import { getOpenServerlessConfig} from './client.js';
import {program} from "commander";
import process from "process";

program
    .description('Deployer info')
    .argument('<param>', 'The key to query')
    .argument('<param>', 'The default value')
    .parse(process.argv);

const key = program.args[0];
const def = program.args[1] || '';

getOpenServerlessConfig(key,def).then(paramValue => {
    console.log(paramValue);
});