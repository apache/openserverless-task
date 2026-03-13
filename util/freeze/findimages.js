/*
write a simple bun script with no deps that will list images to be preloaded
assume IMAGE_DIR are available in process.env

read all the component images from the section config.images
in $OPS_ROOT/opsroot.json skip controller and invoker

search the runtime images looking in $OPS_ROOT/runtimes.json
pick only  entries with default true, skipping those with tag nightly or latest

assemble image from the image sction using docker.io/<prefix>/<name>:tag

for each image found:
- if the file $IMAGE_DIR/<base64 of image> exists, skip the preloading
- print the image to be preloaded

*/
const opsRoot = process.env.OPS_ROOT
const imageDir = process.env.IMAGE_DIR

const images = []

// Component images from opsroot.json, skip controller and invoker
const skipKeys = new Set(["controller", "invoker"])
const opsroot = await Bun.file(`${opsRoot}/opsroot.json`).json()
for (const [key, img] of Object.entries(opsroot.config.images)) {
  if (skipKeys.has(key)) continue
  images.push(img)
}

// Runtime images from runtimes.json, only defaults, skip nightly/latest tags
const skipTags = new Set(["latest", "nightly"])
const runtimes = await Bun.file(`${opsRoot}/runtimes.json`).json()
for (const family of Object.values(runtimes.runtimes)) {
  for (const runtime of family) {
    if (!runtime.default || !runtime.image) continue
    const { prefix, name, tag } = runtime.image
    if (!tag || skipTags.has(tag)) continue
    images.push(`docker.io/${prefix}/${name}:${tag}`)
  }
}

// Print only images that need preloading
for (const img of images) {
  const marker = `${imageDir}/${btoa(img)}`
  const found = await Bun.file(marker).exists()
  if (!found) {
    console.log(img)
  }
}
