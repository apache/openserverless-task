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

export function expandEnv(str, env = process.env) {
  // Stato per sapere se siamo dentro apici singoli
  let inSingleQuotes = false;
  let result = "";
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    // Toggle apici singoli (niente espansione all'interno)
    if (ch === "'") {
      inSingleQuotes = !inSingleQuotes;
      result += ch;
      i++;
      continue;
    }

    // Espansione variabile
    if (ch === "$" && !inSingleQuotes) {
      if (str[i + 1] === "{") {
        // Forma ${...}
        const end = str.indexOf("}", i + 2);
        if (end === -1) {
          result += ch; // niente chiusura, lasciamo così
          i++;
          continue;
        }
        const expr = str.slice(i + 2, end);
        const match = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:(:-|:=)(.*))?$/);

        if (match) {
          const [, name, op, def] = match;
          let val = env[name];
          if ((op === ":-" && (!val || val === "")) || (op === ":=" && (!val || val === ""))) {
            val = def ?? "";
            if (op === ":=") env[name] = val; // assegna
          }
          result += val ?? "";
        } else {
          result += "${" + expr + "}";
        }
        i = end + 1;
      } else {
        // Forma $VAR o variabili speciali
        const varMatch = str.slice(i + 1).match(/^([A-Za-z_][A-Za-z0-9_]*|[0-9@#?$*!-])/);
        if (varMatch) {
          const name = varMatch[1];
          let val;
          if (name === "$") val = process.pid;
          else if (name === "?") val = "0"; // Cannot determine actual exit code without execution context
          else if (name === "#") val = "0";
          else if (name === "!") val = "";
          else val = env[name] ?? "";
          result += val;
          i += 1 + name.length;
        } else {
          result += ch;
          i++;
        }
      }
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}
