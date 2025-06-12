Great, I’ll look into how to host a full-featured NestJS REST API on Vercel, ensuring it behaves like a standard backend (not just individual serverless functions). I’ll cover deployment steps, any configuration or structural adjustments needed, and Vercel-specific limitations.

I’ll get back to you shortly with a detailed setup guide.


# Deploying a NestJS REST API on Vercel (Backend-Only)

Deploying a **full-featured NestJS REST API** on Vercel is possible, but it requires adapting your NestJS application to Vercel’s **serverless** model. Vercel is primarily a serverless platform (optimised for frontends and APIs), so you cannot run a persistent Node server as on a traditional VM or Heroku. Instead, you’ll deploy your Nest app as **serverless function(s)**. Below is a comprehensive guide covering feasibility, necessary adaptations, project structure, configuration, limitations, and handling of environment variables and logs.

## 1. Feasibility of Running a Full NestJS App on Vercel

**Can you deploy a NestJS app without splitting it into many functions?** – Yes, you *can* deploy a NestJS API as a single serverless function on Vercel (i.e. one function handling all routes). Vercel will spin up this function on demand to handle incoming requests. However, this still means your app runs in a stateless, **on-demand** environment rather than as a continuously running server. In practice, you’ll create one handler that boots the NestJS app and forwards all requests to it (or, for very large apps, you might later split by module/route to multiple functions for performance). Crucially, you do **not** have to manually convert every Nest controller into a separate function – one function can encompass the entire REST API.

That said, **out-of-the-box NestJS (with its normal `main.ts`)** isn’t immediately compatible with Vercel’s requirements. Vercel expects each serverless function to export a handler (e.g. `module.exports` or `export default function`) to process requests. A standard NestJS `main.ts` that just calls `app.listen(3000)` won’t work on Vercel without modification – it would start a server that never actually listens, since Vercel’s environment doesn’t expose a traditional long-lived port. Thus, some tweaks are needed to **adapt Nest’s HTTP server to Vercel’s invocation model**.

**Bottom line:** You cannot run a NestJS app on Vercel as a continuously running server, but you *can* deploy it in Vercel’s serverless **function** environment while preserving the NestJS architecture (modules, controllers, providers, etc.). The Nest app will initialise on the first request and then handle incoming HTTP requests on each invocation.

## 2. Adapting NestJS for Vercel’s Serverless Environment

To adapt your NestJS REST API for Vercel, you essentially need to **wrap the NestJS application in a serverless function handler**. This usually involves:

* **Bootstrap on first invocation:** Create (or obtain) the Nest application instance when the function is first called (cold start), and **reuse it** for subsequent requests on the same lambda instance to avoid re-initialising on every call.
* **Export a request handler:** Instead of (or in addition to) calling `app.listen()`, export a function (e.g. `export default function handler(req, res)`) that Vercel will invoke. This handler should pass the incoming `req` and `res` objects to Nest’s underlying HTTP adapter (Express by default).

There are two common approaches:

**A. Modify `main.ts` (conditionally):** You can adjust your `src/main.ts` to detect the Vercel environment and export a handler. For example:

```ts
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { VercelRequest, VercelResponse } from '@vercel/node';

let server: any;  // will hold the Express server instance

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // (Enable CORS, apply global pipes, etc., as needed)
  await app.init();  // do not app.listen(), just initialize the app
  server = app.getHttpAdapter().getInstance();
}

// If not on Vercel, start the server normally (for local dev)
if (!process.env.VERCEL_REGION && !process.env.NOW_REGION) {
  bootstrap().then(() => console.log('Nest app listening...'));
}

// Vercel will invoke this exported function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!server) {
    await bootstrap();  // cold start initialization
  }
  server(req, res);  // let Nest (Express) handle the request
}
```

In the above pattern, when running on Vercel, the `handler` ensures the Nest app is initialised **once** and then proxies incoming requests to the NestJS Express instance. (For local development or other environments, you can still call `app.listen()` so your app runs as usual.) This approach maintains your NestJS architecture – the framework handles routing, controllers, services, etc., just as it would normally.

**B. Use a dedicated “serverless” entry file:** Alternatively, keep your `main.ts` standard for local usage, and create a separate entry for Vercel (for example, an `api/index.ts` or `vercel-handler.ts`). In that file, bootstrap the Nest app similarly and export the handler. This was demonstrated by one guide where a `vercel-func.js` was used to bootstrap Nest and handle requests. For instance, in **Kristijan Knežević’s example**, they created a file that does:

```ts
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './dist/app.module';
let app;  // cached Nest application
export default async function handler(req, res) {
  if (!app) {
    app = await NestFactory.create(AppModule);
    // app.enableCors({...}); etc. – configure as needed
    await app.init();
  }
  // Forward request to Nest's internal Express server:
  const expressInstance = app.get(HttpAdapterHost).httpAdapter.getInstance();
  expressInstance(req, res);
}
```

This accomplishes the same goal: on first call, create the app and then reuse it. The **NestFactory’s** `app.init()` call is important – it prepares the app without starting an HTTP listener, which isn’t needed in serverless. After init, `app.getHttpAdapter().getInstance()` gives access to the underlying Express handler function that can accept `(req, res)` arguments.

**Summary:** Whichever approach you choose, the key is **exporting a handler** that Vercel can use. This handler should ensure the NestJS app is bootstrapped (once) and then delegate the incoming HTTP request to Nest’s Express (or Fastify) instance. By doing this, you maintain all NestJS features (routing, middleware, interceptors, etc.) as if it were a normal server – the difference is simply that the server is started within a lambda function on demand.

## 3. Project Structure and `vercel.json` Configuration

For Vercel to deploy your backend-only NestJS project correctly, you need to configure how the build and routes are handled. This is typically done with a **`vercel.json`** file at the root of your project. This file tells Vercel what to build and how to route requests. For a NestJS REST API, a common configuration is:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/main.ts",      // entry point (TypeScript source)
      "use": "@vercel/node"      // use Vercel's Node.js runtime
    }
  ],
  "routes": [
    {
      "src": "/(.*)",            // catch all paths
      "dest": "src/main.ts",     // send them to our main handler
      "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
    }
  ]
}
```

This example (for NestJS 10+) instructs Vercel to treat **`src/main.ts`** as a serverless function entry, and routes *all* HTTP methods and paths to it. (You can adjust the path or methods if you want to limit what goes to this function, but in a pure API backend, catching everything is typical.) Vercel’s Node builder will detect the `.ts` file and compile it – you do **not** necessarily need to precompile to JavaScript if using this approach, as Vercel can handle TypeScript sources directly with the `@vercel/node` runtime.

**Important notes about the config and structure:**

* The above assumes you’ve exported a handler from `main.ts` (or whichever file you point to). If you forget to export, you’ll see an error like *“No exports found in module ... Did you forget to export a function or a server?”*. Make sure your file exports the function as shown earlier.
* You can use a different file for the handler (e.g. `api/index.ts`). In that case, adjust the `builds.src` and `routes.dest` to that file. Some prefer an `api` directory approach (mimicking Next.js), which also works: for example, placing your handler in `api/index.ts` and then using:

  ```json
  "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "api/index.ts" }]
  ```

  Vercel will deploy `api/index.ts` as a serverless function for all routes. Choose the approach that best fits your repo layout.
* Ensure that all your NestJS build output or source files are included. If you use TypeScript source directly (as above), Vercel’s builder will bundle the code (via webpack or ncc) including any imported files. If instead you rely on building to a `dist/` directory, you might need to adjust config:

  * One approach is to point Vercel to the compiled file (e.g. `"src": "dist/main.js"` and `"dest": "dist/main.js"`). In that case, you **must** ensure the `dist` exists at deploy time (either by committing it, or by running a build step on Vercel) and include all compiled files. For example:

    ```json
    {
      "builds": [{ "src": "dist/main.js", "use": "@vercel/node", "config": { "includeFiles": ["dist/**"] } }],
      "routes": [{ "src": "/(.*)", "dest": "dist/main.js" }]
    }
    ```

    The `"includeFiles": ["dist/**"]` ensures the entire `dist` directory is uploaded, not just the entry file. This is crucial if your compiled Nest app consists of multiple JS files. Some setups use a Git **pre-commit hook** to build and commit the `dist` folder so that Vercel can deploy it easily. While this works, it’s often simpler to let Vercel handle the TypeScript if possible.
  * If using the TypeScript source approach (pointing to `src/main.ts`), note that Vercel may not actually produce a `dist` folder at runtime. In fact, one guide suggests manually adding an empty `dist` folder (with a `.gitkeep` file) to appease certain build expectations or CORS quirks. Another approach (from an older solution) is to include a dummy `public/index.html` so that using `@vercel/static-build` triggers a build step. These hacks were more relevant historically; as of 2024+, Vercel’s Node runtime can handle TypeScript functions directly, so you may not need an empty `dist`—just ensure your `vercel.json` is correct.
* **Project structure:** other than the special handler and `vercel.json`, your NestJS project structure remains “proper NestJS”. You still have your `src` directory with modules, controllers, etc., and optionally a `dist` for compiled files (ignored from git if not needed). Here’s a sample structure for clarity:

  ```bash
  my-nestjs-project/
  ├── src/
  │   ├── main.ts            # NestJS bootstrap (exporting handler for Vercel)
  │   ├── app.module.ts      # Your NestJS root module
  │   ├── controllers/, services/, etc.
  │   └── ...other Nest files...
  ├── vercel.json            # Vercel configuration
  ├── package.json
  ├── tsconfig.json (and nest-cli.json, etc.)
  └── (maybe) api/index.ts   # If you use a separate API handler file
  ```

  Ensure `package.json` has all dependencies (including NestJS and any reflect-metadata, etc.) so that Vercel installs them. Also, define a **build script** (`"build": "nest build"` by default) even if Vercel isn’t directly using it, for consistency and local testing. Vercel will run `npm install` (and potentially `npm run build` if using the static build hack or if you configure a Build Command in the UI).

## 4. Cold Starts, Execution Limits, and Other Serverless Considerations

Running a NestJS app on Vercel means accepting the typical **serverless function constraints**:

* **Cold Starts:** When a function instance is idle or scaled down, the next request will incur a cold start as Vercel loads your function. A NestJS app is relatively heavy to initialize – expect cold start times on the order of a couple of seconds, potentially more for large apps. Real-world reports show cold starts in the range of **1–7 seconds** for Node functions on Vercel. Vercel has introduced improvements (e.g. their 2025 “Fluid mode”), but you should assume that the **first request** after a period of no traffic will be slower. Mitigations include keeping the deployment warm (pinging it periodically) or splitting into smaller functions if cold starts become a bottleneck.
* **Execution Time Limits:** Vercel enforces timeouts on function execution. On the **Hobby (free)** plan, the limit is around **10 seconds**, and on the **Pro** plan up to **60 seconds** per invocation. This means any single request that takes longer will be terminated. A standard REST API call should ideally complete well under these limits, but be mindful if you plan to add long-running tasks – those might not be suitable for Vercel serverless without workarounds (like splitting work or offloading to a queue/cron).
* **Memory and Package Size Limits:** Vercel functions have a memory limit (e.g. \~256MB by default on free, higher on paid) and a **bundle size limit (50 MB)** for the deployed function code including dependencies. A typical NestJS API with moderate dependencies is usually under this, but if you include large binaries or many packages, watch out. If you approach the size limit, you might need to trim dependencies or use multiple functions. (The **NestJS framework** itself is not too large, but adding many libraries can bloat the bundle.)
* **Statelessness & Concurrency:** Each request can run on a **different** isolated instance, and instances scale out automatically for concurrent traffic. There is *no shared in-memory state* between requests. For example, if you use in-memory cache or store data in a global variable, one instance won’t know about another. **Sessions** or other stateful aspects need external storage (database, Redis, etc.). Indeed, developers have found that using in-memory sessions will fail on Vercel when load increases – e.g. one instance’s session data won’t be seen by another, leading to conflicts. The solution is to use a persistent store (Redis, etc.) for sessions or any shared state. In short, design your NestJS app as you would for a distributed environment: **stateless** and horizontally scalable.
* **File system**: Vercel provides a read-only file system for your deployment bundle. At runtime, you can write to `/tmp` (which is ephemeral and *per invocation*), but you cannot rely on writing files permanently. If your Nest app serves any static files (e.g. Swagger UI assets or other public files), you’ll need to ensure they are bundled or use an external CDN. For example, Swagger’s default UI assets might not load on Vercel by default; a known fix is to use external Swagger CSS/JS URLs or adjust the Swagger setup to serve from CDN. Generally, static assets in Nest (like a `public/` folder) are not served by default on Vercel unless you configure them (you could use a static build output or the `public` directory feature). Since your scenario has *no frontend assets*, this mostly isn’t a concern, but keep it in mind if you add any static file serving.
* **No WebSockets or long-lived connections:** Vercel Serverless Functions do not support upgrading to WebSockets. All communication is request-response. (Vercel *does* have support for WebSockets via separate means like the Edge functions or using third-party services.) If your NestJS app in future needed WebSockets, you’d have to adjust – e.g. use a different host for that portion or use polling/Server-Sent Events with awareness of Vercel’s function timeouts. For now, with pure REST, you’re fine.

Overall, a NestJS app will run on Vercel, but expect slightly different performance characteristics than a traditional server. Cold starts and concurrency are the main differences in behaviour. For **best performance**, do as much heavy initialisation as possible *outside* the request handler (during the cold start) and keep each request’s work lightweight. The pattern of caching the Nest app instance in the function (shown above) is crucial for performance – without it, *every request* would bootstrap a new Nest application, which would be disastrously slow. With caching, only cold starts pay that cost.

## 5. Build & Deployment Process with Nest CLI

Vercel’s deployment flow can integrate with your Nest CLI build, but it might require configuration. Key points:

* **Installing dependencies:** When you push your project to Vercel (via Git integration or CLI), Vercel will install your `package.json` dependencies. This is automatic – ensure your NestJS and any other packages are listed in dependencies (not just devDependencies if they’re needed at runtime).
* **Running the build (transpilation):** If you use the `@vercel/node` runtime on a TypeScript file, Vercel will handle transpiling it under the hood (using either their Node compiler or bundler). In this case, you might **not need to run `nest build` manually** on Vercel. The `vercel.json` configuration above essentially tells Vercel, “take my `src/main.ts` and bundle it.” This means you don’t strictly need a custom build command – Vercel will detect the TypeScript and compile it.

  * However, if you want more control or if you find Vercel isn’t building as expected, you have options. You can specify a **Build Command** in the Vercel project settings (e.g. `npm run build`) so that the Nest CLI compiles the project before the serverless function is packaged. Another way is the trick used by one guide: include a `"builds"` entry for `package.json` with `@vercel/static-build` so that Vercel runs the `build` script. For example:

    ```json
    "builds": [
      { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "public" } },
      { "src": "vercel-func.js", "use": "@vercel/node" }
    ]
    ```

    In that setup, the first build step runs the `build` (because Vercel assumes a static build and runs the `build` script, expecting output in `public/` which we trick with an empty file). The second step deploys the function. **This hack** was mainly needed historically; a cleaner approach today is to just set the Build Command in Vercel to `npm run build && npm run start` or similar, but since we aren’t “starting” a server, usually just building is enough. Most recent examples simply rely on `@vercel/node` to handle TS, as shown in the vercel.json earlier.
  * If you *do* run `npm run build` (Nest CLI) on Vercel, ensure the output (default `dist/` folder) is either uploaded or used by the function. As noted, you can deploy from `dist` by pointing the function at `dist/main.js` and including the files. This might be useful if you prefer to debug the compiled output or use certain Nest CLI features. Otherwise, letting Vercel compile on the fly is fine for a Node API.
* **Nest CLI assets:** If your Nest app uses assets (e.g. templates, JSON files, etc. declared in `nest-cli.json` assets), ensure those are also present. Vercel’s bundler might not automatically include non-imported files. You might need to use the `includeFiles` config in vercel.json or copy those assets to a place Vercel will deploy. Check Vercel’s docs if you have such files – or consider embedding them in code or storing externally if possible.
* **Continuous deployment:** Once configured, every git push (to the branch Vercel monitors, e.g. `main`) triggers a deployment. Vercel will perform the install, build (as configured), and deploy the function. You can also use the Vercel CLI to deploy manually if needed. The NestJS app, when deployed, will be accessible at your Vercel domain (e.g. `https://your-project.vercel.app`) for all the defined routes.

In summary, Vercel **does support** a Nest CLI build flow, but often you won’t even notice it – by pointing to a TS file, the build is happening under the hood. Should you need to explicitly run the Nest build, use vercel.json or the project settings to specify it. Several developers have confirmed that simply using the config with `src/main.ts` works and **Vercel successfully compiles and deploys the Nest app**.

## 6. Examples and Templates

You’re not alone in deploying NestJS on Vercel – there are community examples and starters. For instance, Yosif Yosifov’s Medium article and example config helped confirm the vercel.json setup, and Bilal Ur Rehman’s guide shows deploying Nest with a Postgres DB on Vercel. There’s also an example repo by Hamidreza (mahdavipanah on GitHub) called **nestjs-on-vercel**, which provides a minimal NestJS setup adapted for Vercel. That repository (and others like *template-nestjs-vercel*) can be a good reference to see the file setup. Many such guides use the techniques described above, so following this guide will put you in line with those examples.

In short, the community has demonstrated it’s quite feasible – you might even find a boilerplate to fork. But with the steps in this answer, you should be able to configure your existing NestJS project for a smooth Vercel deployment without needing Next.js or any frontend.

## 7. Environment Variables on Vercel (Configuration & Usage)

For a backend API, you’ll likely need secrets or config (database URLs, API keys, etc.). Vercel supports environment variables which you can define in the Project Settings on the Vercel dashboard (or using the Vercel CLI). Here’s how they work with NestJS on Vercel:

* **Setting env vars:** In your Vercel project’s settings, go to the **Environment Variables** section and add your keys (for example, `DATABASE_URL`, `JWT_SECRET`, etc.) with their values. You can set different values per environment (Development, Preview, Production) if needed. Alternatively, use the CLI: `vercel env add VARIABLE_NAME production` and so on.
* **Using them in NestJS:** Vercel injects these as real environment variables at runtime. Your NestJS app can read them via `process.env`. For example, using Nest’s ConfigService or directly `process.env.MY_VAR`. This is just like running the app locally with those env vars – no special syntax needed. If you have a `.env` file for local development, you can replicate those keys in Vercel’s settings for production. (Do **not** commit your `.env` to git; use Vercel’s secure storage instead.)
* **No client exposure:** These backend env vars are not exposed to a front-end by default. They exist only in the serverless function’s environment. If you had a Next.js frontend on Vercel, it distinguishes public vs secret env vars, but in a pure API project this isn’t an issue – all env vars you set are available to the server code and kept private.

When deploying, Vercel will show a prompt to enter any missing environment variables during the setup of a new project, or you can add them beforehand. In Bilal’s guide, after connecting the repo, he notes *“enter the environment variables if any and then hit deploy.”* – once provided, the NestJS app on Vercel can use them seamlessly.

One caveat: Because each function invocation could be on a fresh instance, if you plan to **modify env vars at runtime**, that won’t persist (and is generally not possible – env vars are readonly once the process starts). Configure all needed variables via Vercel’s UI/CLI, not within the code at runtime.

## 8. Logging and Debugging in Vercel

Logging in a serverless environment is a bit different from tailing logs on a VM, but Vercel makes it straightforward:

* **Use console logs or NestJS Logger:** Anything your NestJS app writes to stdout/stderr (e.g. `console.log`, `console.error` or Nest’s built-in Logger which by default prints to console) will be captured by Vercel. You don’t need any special logging library for basic use. For example, if NestJS logs “Listening on port X” or any error stack, those will appear in Vercel’s logs.
* **Viewing logs:** Vercel provides a **“Logs” tab** in your project dashboard where you can see real-time logs for function invocations. Each request (or function execution) will output its logs there. You can filter by deployment or timeframe. Additionally, you can use the Vercel CLI: running `vercel logs <deployment-url>` will stream the logs to your terminal. This is handy for debugging. The logs will show each invocation’s output and errors, which is crucial for debugging serverless functions that might “crash” or time out. In case of a crash, Vercel will also show an error message in the response (“500: INTERNAL\_SERVER\_ERROR – Function invocation failed”) and the real cause can be seen in the logs.
* **Persisting or external logging:** Note that Vercel’s logs are not permanently stored (you get a recent history). For most cases, this is fine. If you need long-term aggregation, you might integrate an external logging service or use Vercel’s Log Drains to forward logs. But for a basic setup, relying on Vercel’s built-in logs is adequate.
* **Debugging locally:** You can use `vercel dev` to simulate Vercel functions locally. This can help test that your `vercel.json` and handler work as expected before deploying. It will run your function on a local endpoint. Also, you can of course run `npm run start:dev` for Nest locally (which will use the normal `main.ts` bootstrap listening on a port). Just keep in mind the code path that exports the handler might not execute in local mode, so sometimes developers maintain two entry points (as discussed).

## 9. Conclusion & Final Tips

Deploying a backend-only NestJS API to Vercel is definitely achievable and many have done it. In summary:

* **Use a single serverless function** to encompass your NestJS app (unless/until scaling needs push you to split modules into separate functions).
* **Adjust your bootstrap** to export a handler that Vercel can invoke. This typically means calling `app.init()` instead of `app.listen()`, and capturing the underlying Express server to handle requests.
* **Configure `vercel.json`** to route all traffic to this function. This file is essential in overriding Vercel’s default behaviour and telling it how to serve your Nest API.
* **Be aware of serverless constraints**: cold starts, statelessness, timeouts, etc. NestJS will work, but you might need to tweak things like CORS setup (allowing all required methods and headers) and session management (use external stores if needed) for a production-ready app on Vercel.
* **Environment variables** are supported and easy to manage via Vercel’s dashboard – use them for any secrets or config, just as you would locally.
* **Monitor logs** via Vercel’s interface or CLI to debug issues. For example, if your function crashes on Vercel, check the logs to see if perhaps a module is missing or an error is thrown during init. Common mistakes include forgetting to include the `dist` files or misconfiguring the handler export – logs will quickly reveal these.

Lastly, if you need a reference, you can check out community examples like the GitHub repo “nestjs-on-vercel” for a working template. Many developers have documented their steps (Medium/Dev.to articles) – including handling specific issues like Swagger UI assets or cookie sessions – so those can provide additional guidance if you run into a niche problem. With the above setup, your NestJS application (with its familiar controller/service structure) should deploy on Vercel’s serverless platform and function as a REST API endpoint, all **without any Next.js frontend**, exactly as you intended.

**Sources:**

* Vercel official docs and community answers on deploying Node.js/TypeScript functions and NestJS configurations.
* Community guides: Medium and Dev.to articles by Y. Yosifov, K. Knežević, D. Le, B. Ur Rehman, etc., sharing working `vercel.json` setups and tips.
* “Lessons Learned: Hosting NestJS on Vercel” – discussing necessary tweaks like CORS and sessions in a serverless context.
* Vercel limits and performance considerations (cold starts, timeouts) as analyzed in a 2025 Medium piece.
* Stack Overflow Q\&A on fixing NestJS deployment on Vercel, confirming the use of `src/main.ts` entry and correct exports.
* Vercel documentation on viewing function logs and managing environment variables.
