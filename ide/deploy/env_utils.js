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
