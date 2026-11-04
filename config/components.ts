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

export const keys: Record<string,string> = Object.fromEntries(
  ["redis","mongodb","cron","static","postgres","prometheus","quota","milvus","registry","seaweedfs","etcd"].map(x => [x, `OPERATOR_COMPONENT_${x.toUpperCase()}`])
);
Object.assign(keys, {alertmanager:"OPERATOR_COMPONENT_AM", slack:"OPERATOR_CONFIG_ALERTSLACK", mail:"OPERATOR_CONFIG_ALERTGMAIL", affinity:"OPERATOR_CONFIG_AFFINITY", tolerations:"OPERATOR_CONFIG_TOLERATIONS"});
const dependencies: Record<string,string[]> = {mongodb:["postgres"], milvus:["etcd","seaweedfs"], static:["seaweedfs"], alertmanager:["prometheus"], slack:["alertmanager"], mail:["alertmanager"]};
export function plan(mode: string, flags: string[], env: Record<string,string|undefined>) {
  if (!["enable","disable","full"].includes(mode)) throw new Error("Invalid configuration operation");
  for (const flag of flags) if (flag !== "all" && !keys[flag]) throw new Error(`Unknown component: ${flag}`);
  const on = mode !== "disable";
  const selected = new Set(flags.filter(x => x !== "all"));
  if (flags.includes("all") || mode === "full") for (const name of Object.keys(keys)) {
    // Notification destinations require explicit opt-in. Full also excludes scheduling policies.
    if (on && ["slack","mail"].includes(name)) continue;
    if (mode === "full" && ["affinity","tolerations"].includes(name)) continue;
    selected.add(name);
  }
  if (on) {
    const include = (name: string) => {for (const dep of dependencies[name] || []) if (!selected.has(dep)) {selected.add(dep);include(dep)}};
    for (const name of selected) include(name);
    const required: Record<string,string[]> = {
      slack:["OPERATOR_CONFIG_SLACK_APIURL","OPERATOR_CONFIG_SLACK_CHANNELNAME"],
      mail:["OPERATOR_CONFIG_GMAIL_USERNAME","OPERATOR_CONFIG_GMAIL_PASSWORD","OPERATOR_CONFIG_EMAIL_FROM","OPERATOR_CONFIG_EMAIL_TO"]
    };
    for (const name of ["slack","mail"]) if (selected.has(name)) {
      const missing = required[name].filter(k => !env[k]?.trim());
      if (missing.length) throw new Error(`Configure notifications first with ops config ${name}; missing: ${missing.join(", ")}`);
    }
  } else {
    // Disabling a prerequisite disables its dependants, never unrelated prerequisites.
    let changed = true;
    while (changed) {changed = false;for (const [name,deps] of Object.entries(dependencies)) {
      if (!selected.has(name) && deps.some(dep => selected.has(dep))) {selected.add(name);changed=true;}
    }}
  }
  return Object.fromEntries([...selected].map(name => [keys[name], String(on)]));
}
export function validate(env: Record<string,string|undefined>) {
  const failures: string[] = [];
  for (const name of ["seaweedfs","static"]) if (env[keys[name]] !== "true") failures.push(`frontend requires ${name}`);
  for (const [name,deps] of Object.entries(dependencies)) if (env[keys[name]] === "true") {
    for (const dep of deps) if (env[keys[dep]] !== "true") failures.push(`${name} requires ${dep}`);
  }
  for (const name of ["slack","mail"]) if (env[keys[name]] === "true") {
    try {plan("enable",[name],env)} catch(e) {failures.push((e as Error).message)}
  }
  if (failures.length) throw new Error(`Invalid setup configuration: ${failures.join("; ")}. Review ops config enable/disable before retrying.`);
}
if (import.meta.main) {
  try {
    const mode = process.argv[2];
    if (mode === "validate") validate(process.env);
    else {
      const flags = process.argv.slice(3).filter(x => x.endsWith("=true")).map(x => x.slice(2,-5));
      for (const [key,value] of Object.entries(plan(mode,flags,process.env))) console.log(`${key}=${value}`);
    }
  } catch(e) {console.error(`ERROR: ${(e as Error).message}`);process.exitCode=1;}
}
