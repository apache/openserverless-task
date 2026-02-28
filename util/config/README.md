## Openserverless Configurator task

### Development:

The configurator is inside the `configurator` folder.
The entrypoint is the `configurator/index.ts` file. It simply calls the configurator main function.

All the logic is inside the `configurator/configurator.ts` file. Of course, you can add more files
and change the structure as you see fit.

From the root of the project, go to the `util/config/configurator` folder:

```bash
cd util/config/configurator
```

First install the dependencies:

```bash
bun install
```

In the `package.json` file there are a couple of scripts. The `start` script will run the configurator:

```bash
bun run start
```

### How can the ops command be configured?

Before understanding the configurator, let's see how you can manage the ops configuration.

From the command line, run the following command:

```bash
ops -config -d
```

it returns the configuration of `ops` command. The output is a text file containing a number of key-value tuples separated by an `=` sign and that looks like this:

```terminaloutput
<omitted>
S3_API_URL=http://localhost:9000
<omitted>
POSTGRES_PORT=5432
<omitted>
OPERATOR_COMPONENT_MILVUS=true
OPERATOR_COMPONENT_KAFKA=false
<omitted>
S3_PROVIDER=minio
<omitted>
```

You can also set the value of a single parameter by running:

```bash
ops -config HELLO=123
```

and read the value of a single parameter from the output of the command:

```bash
ops -config HELLO
```

and remove the parameter by running:

```bash
ops -config -r HELLO
```

Finally, you can check if a parameter doesn’t exist anymore by running:

```bash
ops -config HELLO
```

which returns an error because you removed the parameter:

```terminaloutput
error: invalid key: 'HELLO' - key does not exist
```

### How does the configurator work?

Now that you know how you can manage the `ops` configuration, let's see how the configurator works.

When you run the configurator with a valid configuration file,

If you run the configurator without an argument to specify a configuration file, a help message is shown:

```bash
bun run start
```

otherwise, you can specify a configuration file:

```bash
bun run start your-configuraton-file.json
```

If the configuration file is valid, the configurator will run the command

```bash
ops -config -d
```

and will compare the output with the configuration file.

So, if you store the following content in a json file called `hello-config.json`: 

```json
{
  "HELLO": {
    "type": "string"
  }
}
```

the command

```bash
ops util config <PATH-TO-THE-CoNFIGURATION-FILE>/hello-config.json
```

launches an interactive configurator that sequentially reads the configuration file.
For each item found, it prompts the user to assign a value, then proceeds to execute the `ops -config ` command.

For example,  the `HELLO` parameter is of type `string` and the configurator asks for a value that it will assign to it:

```terminaloutput
Enter value for HELLO (string)

World
```
and then the configurator runs the command:

```terminaloutput
ops -config HELLO=World
```

This is how the configurator can interact with the `ops` command.

## New functionality: show current configuration

- Show the current configuration:
  - show only the parameters needed for the components below:
    - redis
    - ferretdb
    - cron
    - prometheus
    - slack
    - mail
    - affinity
    - tolerations
    - quota
    - alert manager


To do this, we need to know for each component what are its parameters.

### redis 
$ ops -config -d grep -i REDIS

To extract the names of the parameters,

$ ops -config -d | awk -F= '/=/{print $1}'




### Development with WebStorm:

Install and configure WebStorm to use the bun as described here: https://www.jetbrains.com/help/webstorm/bun.html

#### To run the configurator with a valid config file from the command line:

- change directory to `/util/config/configurator`
- run the following command:
    ```bash
    `ops util config `./tests/fixtures/valid.json
    ```

### Tests:

There are unit tests inside the `configurator/test` folder. You can run them with the following command:

```bash
bun run test
```

### Building:

To build the configurator and generate the `configurator.js` file, run the following command:

```bash
bun run build
```

It will generate the `configurator.js` file and move it in the parent, where it can be used by the opsfile task.




**** TODO SISTEMARE DA QUI

```bash
cd /home/daniele/projects/github/apache/openserverless-task/util/config/configurator
```


```bash
bun run start all-config-parameters.toml
```
