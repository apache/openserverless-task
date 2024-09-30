import { expect, test, describe } from "bun:test";
import {
  readPositionalFile,
  parsePositionalFile,
  NotValidJsonMsg,
  HelpMsg,
  AdditionalArgsMsg,
  isInputConfigValid,
  findMissingConfig,
} from "../configurator.ts";

describe("findMissingConfig", () => {
  test("config has some opsConfig key", async () => {
    const config: any = { hello: "world", world: "hello" };
    const opsConfig = "hello=world";
    const newC: any = findMissingConfig(config, opsConfig);
    expect(newC).toEqual({ world: "hello" });
  });

  test("config has no opsConfig key", async () => {
    const config: any = { hello: "world", world: "hello" };
    const opsConfig = "not=existing";
    const newC: any = findMissingConfig(config, opsConfig);
    expect(newC).toEqual({ hello: "world", world: "hello" });
  });

  test("opsConfig has no key", async () => {
    const config: any = { hello: "world", world: "hello" };
    const opsConfig = "";
    const newC: any = findMissingConfig(config, opsConfig);
    expect(newC).toEqual({ hello: "world", world: "hello" });
  });

  test("config and opsConfig are the same", async () => {
    const config: any = { hello: "world", world: "hello" };
    const opsConfig = "hello=world\nworld=hello";
    const newC = findMissingConfig(config, opsConfig);
    expect(newC).toEqual({});
  });
});

describe("validateConfigJson", () => {
  test("empty config", async () => {
    const res = isInputConfigValid({});
    expect(res).toBe(false);
  });

  test("wrong json", async () => {
    const res = isInputConfigValid({
      some: "key",
      properties: { hello: { type: "string" } },
    });
    expect(res).toBe(false);
  });

  test("valid json", async () => {
    const res = isInputConfigValid({
      HELLO: { type: "string" },
      HELLO3: { type: "string" },
      HELLO33: { type: "string" },
      HELLO_3: { type: "string" },
      HELLO_33: { type: "string" },
      HELLO_A_1_B_2: { type: "string" },
      HELLO_A1B2: { type: "string" },
      HELLO_INT: { type: "int" },
      HELLO_FLOAT: { type: "float" },
      HELLO_BOOL: { type: "bool" },
      HELLOPASS: { type: "password" },
      HELLOENUM: { type: ["a", "b", "c"] },
      HELLOENUM3: { type: ["a", "b", "c"] },
    });
    expect(res).toBe(true);
  });
});

describe("readPositionalFile", () => {
  test("no positional arg provided", async () => {
    const res = readPositionalFile(["bun", "index.ts"]);
    expect(res.success).toBe(true);
    expect(res.help).toBe(HelpMsg);
  });

  test("too many positional arg provided", async () => {
    const res = readPositionalFile(["bun", "index.ts", "config.json", "extra"]);
    expect(res.success).toBe(true);
    expect(res.jsonFilePath).toBe("config.json");
    expect(res.message).toBe(AdditionalArgsMsg);
  });

  test("positional arg provided", async () => {
    const res = readPositionalFile(["bun", "index.ts", "config.json"]);
    expect(res.success).toBe(true);
    expect(res.jsonFilePath).toBe("config.json");
  });
});

describe("parsePositionalFile", () => {
  test("file does not exist", async () => {
    const jsonRes = await parsePositionalFile("not-existing");
    expect(jsonRes.success).toBe(false);
    expect(jsonRes.message).toBe(NotValidJsonMsg);
  });

  test("not a json file", async () => {
    const jsonRes = await parsePositionalFile("tests/fixtures/not-json.txt");
    expect(jsonRes.success).toBe(false);
    expect(jsonRes.message).toBe(NotValidJsonMsg);
  });

  test("not a valid json", async () => {
    const jsonRes = await parsePositionalFile("tests/fixtures/bad.json");
    expect(jsonRes.success).toBe(false);
    expect(jsonRes.message).toBe(NotValidJsonMsg);
  });

  test("valid json", async () => {
    const jsonRes = await parsePositionalFile("tests//fixtures/valid.json");
    expect(jsonRes.success).toBe(true);
    expect(jsonRes.body).toHaveProperty("HELLO", { type: "string" }  );
    expect(jsonRes.body).toHaveProperty("HELLO3", { type: "string" } );
    expect(jsonRes.body).toHaveProperty("HELLO_3", { type: "string" });
  });
});
