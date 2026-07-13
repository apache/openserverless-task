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

const BUILDER_ID = /^[a-z0-9][a-z0-9._:-]{0,62}$/;
const IMAGE_PART = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const IMAGE_TAG = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

type RuntimeImage = {prefix?: string; name?: string; tag?: string};
type Runtime = {kind?: string; image?: RuntimeImage};
type RuntimeDocument = {runtimes?: Record<string, Runtime[]>};
type BuilderDefinition = {kind?: string};
type BuilderDocument = {builders?: Record<string, BuilderDefinition>};

export function buildCatalog(
  runtimeDocument: RuntimeDocument,
  builderDocument: BuilderDocument,
): {builders: Record<string, {kind: string; source: string}>} {
  if (!runtimeDocument?.runtimes || typeof runtimeDocument.runtimes !== "object") {
    throw new Error("runtime catalog must contain a runtimes object");
  }
  if (!builderDocument?.builders || typeof builderDocument.builders !== "object") {
    throw new Error("builder definition must contain a builders object");
  }

  const runtimes = Object.values(runtimeDocument.runtimes).flat();
  const builders: Record<string, {kind: string; source: string}> = {};
  for (const [builderId, definition] of Object.entries(builderDocument.builders)) {
    if (!BUILDER_ID.test(builderId)) throw new Error(`invalid builder id: ${builderId}`);
    if (!definition?.kind || !BUILDER_ID.test(definition.kind)) {
      throw new Error(`invalid kind for builder ${builderId}`);
    }

    const runtime = runtimes.find((entry) => entry.kind === builderId);
    if (!runtime) throw new Error(`runtime ${builderId} is not present in runtimes.json`);
    const image = runtime.image || {};
    if (!image.prefix || !IMAGE_PART.test(image.prefix) ||
        !image.name || !IMAGE_PART.test(image.name) ||
        !image.tag || !IMAGE_TAG.test(image.tag)) {
      throw new Error(`runtime ${builderId} has an invalid image`);
    }
    const prefix = image.prefix.includes(".") || image.prefix.includes(":")
      ? image.prefix
      : `docker.io/${image.prefix}`;
    builders[builderId] = {
      kind: definition.kind,
      source: `${prefix}/${image.name}:${image.tag}`,
    };
  }
  return {builders};
}

if (import.meta.main) {
  const [runtimePath, builderPath] = Bun.argv.slice(2);
  if (!runtimePath || !builderPath) {
    throw new Error("usage: bun builders.ts <runtimes.json> <builders.json>");
  }
  const runtimeDocument = await Bun.file(runtimePath).json();
  const builderDocument = await Bun.file(builderPath).json();
  console.log(JSON.stringify(buildCatalog(runtimeDocument, builderDocument), null, 2));
}
