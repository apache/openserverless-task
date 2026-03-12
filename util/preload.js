/*
write a simple bun script with no deps
assume OPS_HOME, OPS_ROOT, KIND_CLUSTER and IMAGE_DIR are available in process.env

read all the component images from the section config.images in $OPS_ROOT/opsroot.json
skip controller and invoker

search the runtime images looking in $OPS_ROOT/runtimes.json
pick only  entries with default true, skipping those with tag nightly or latest

assemble image from the image sction using docker.io/<prefix>/<name>:tag

accpet and optional parameter "true" or "false"
if true enable dry run

for each image found:

- if the file $IMAGE_DIR/<base64 of image> exists, skip the preloading
- otherwise
   if dry:
      print the image, if found or to be preloaded
   else
     - do a docker pull of the images
     - then execute a kind load docker-image of the image in the $KIND_CLUSTER

describe what you do including skipping images and other steps
print the name of the file you are checking
do not write an marker file just repeat the processing

*/
const opsRoot = process.env.OPS_ROOT
const kindCluster = process.env.KIND_CLUSTER
const imageDir = process.env.IMAGE_DIR
const dry = process.argv[2] === "true"

// Collect all images
const images = []

// Read component images from opsroot.json (skip controller and invoker)
const skipKeys = new Set(["controller", "invoker"])
const opsroot = await Bun.file(`${opsRoot}/opsroot.json`).json()
for (const [key, img] of Object.entries(opsroot.config.images)) {
  if (skipKeys.has(key)) {
    console.log(`SKIP: ${img} (${key} excluded)`)
    continue
  }
  images.push(img)
}

// Read runtime images from runtimes.json (only defaults, skip tag "nightly", "latest", or empty)
const skipTags = new Set(["latest", "nightly"])
const runtimes = await Bun.file(`${opsRoot}/runtimes.json`).json()
for (const family of Object.values(runtimes.runtimes)) {
  for (const runtime of family) {
    if (!runtime.default || !runtime.image) continue
    const { prefix, name, tag } = runtime.image
    if (!tag || skipTags.has(tag)) {
      console.log(`SKIP: docker.io/${prefix}/${name}:${tag || "(empty)"} (tag ${tag || "empty"})`)
      continue
    }
    images.push(`docker.io/${prefix}/${name}:${tag}`)
  }
}

if (dry) console.log("DRY RUN enabled")

// Process each image
for (const img of images) {
  const marker = `${imageDir}/${btoa(img)}`

  // Check if already preloaded
  console.log(`CHECK: ${marker}`)
  const found = await Bun.file(marker).exists()
  if (dry) {
    console.log(`IMAGE: ${img}`)
    console.log(`FILE: ${marker}`)
    console.log(found ? `STATUS: SKIP (already on disk)` : `STATUS: PRELOAD`)
    continue
  }
  if (found) {
    console.log(`SKIP: ${img} (already preloaded)`)
    continue
  }

  // Docker pull
  console.log(`PULL: ${img}`)
  const pull = Bun.spawn(["docker", "pull", img], {
    stdout: "inherit",
    stderr: "inherit",
  })
  const pullExit = await pull.exited
  if (pullExit !== 0) {
    console.error(`FAIL: docker pull ${img} exited with ${pullExit}`)
    continue
  }

  // Kind load
  console.log(`LOAD: ${img} -> kind cluster ${kindCluster}`)
  const load = Bun.spawn(["kind", "load", "docker-image", img, "--name", kindCluster], {
    stdout: "inherit",
    stderr: "inherit",
  })
  const loadExit = await load.exited
  if (loadExit !== 0) {
    console.error(`FAIL: kind load docker-image ${img} exited with ${loadExit}`)
    continue
  }

  console.log(`DONE: ${img}`)
}
