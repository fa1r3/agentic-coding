---
id: f3-stack-angular-new-app
kind: skill
name: f3-stack-angular-new-app
description: "Creates a new Angular app using the Angular CLI. This skill should be used whenever a user wants to create a new Angular application and contains important guidelines for how to effectively create a modern Angular application."
version: 1.0.0
status: stable
summary: The angular-new-app skill of the Angular team, adapted to f3: creating the Angular application of the Stack section with the Angular CLI, then generating code with it.
applies-when:
  ui: yes
  frameworks: [angular]
loaded-by: [developer, architect]
---

# Angular New App

## In this project

This skill is the `angular-new-app` skill of the Angular team (github.com/angular/angular, `skills/dev-skills/angular-new-app`, commit `ee18d57`, MIT license in `LICENSE`), adapted where it conflicts with f3:

- **Agent files.** `ng new` runs with `--ai-config=none`: `AGENTS.md`, `CLAUDE.md` and the other files of the tools belong to f3, and the guidelines to follow are those of `AGENTS.md` and of the practice skills of the project. Upstream asks for `--ai-config=agents` and to load the file it writes.
- **Version and place.** The Angular version, the package manager and the folder of the interface come from the Stack section of `AGENTS.md`; the CLI runs through `npx @angular/cli@<version>`. Upstream installs the CLI globally and takes the latest version.
- **MCP server.** The Angular CLI MCP server (`ng mcp`) is used only if the project declares it in its tool files, which f3 writes; propose it otherwise.

The rules of `AGENTS.md` win when they and this skill differ.

## Steps

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices. You have access to tools to create new Angular apps.

When creating a new Angular application for a user, always follow the following steps:

1. **Check the Angular CLI**: Read the Angular version of the Stack section of `AGENTS.md`, and run the CLI as `npx @angular/cli@<version>`. A global CLI (`which ng` on `*nix` systems, `where ng` or `gcm ng` on Windows) is used only if its version is that one. Never install the CLI globally without asking the user.

   _IMPORTANT_: There are best practices available for building outstanding Angular applications via the MCP server that is bundled with the Angular CLI, through `ng mcp` and its `get_best_practices` tool, when the project declares it.

2. **Create the new application**: Take the name and the folder of the application from the Stack section, or ask the user. Create the application with the following command:

   `npx @angular/cli@<version> new <app-name> [list of flags based on the Stack section] --interactive=false --ai-config=none`

   Consider these commonly useful flags based on the Stack section:
   - `--directory=<folder>` — the folder of the interface, for example a package of the workspace
   - `--style=scss|css|less` — stylesheet format
   - `--routing` — add routing module
   - `--ssr` — enable server-side rendering
   - `--prefix=<prefix>` — component selector prefix
   - `--skip-git` — the repository of the project already exists
   - `--skip-tests` — only if the user explicitly requests it

3. Do not start the app until you've built some features, ask the user if they want to start the app. You can always run `npx ng build` to check for errors and repair them.

4. Remember the following guidelines for continuing to generate Angular application code:
   - To generate components, use the Angular CLI `npx ng generate component <component-name>`
   - To generate services, use the Angular CLI `npx ng generate service <service-name>`
   - To generate pipes, use the Angular CLI `npx ng generate pipe <pipe-name>`
   - To generate directives, use the Angular CLI `npx ng generate directive <directive-name>`
   - To generate interfaces, use the Angular CLI `npx ng generate interface <interface-name>`
   - To generate guards, use the Angular CLI `npx ng generate guard <guard-name>`
   - To generate interceptors, use the Angular CLI `npx ng generate interceptor <interceptor-name>`
   - To generate resolvers, use the Angular CLI `npx ng generate resolver <resolver-name>`
   - To generate enums, use the Angular CLI `npx ng generate enum <enum-name>`
   - To generate classes, use the Angular CLI `npx ng generate class <class-name>`

   _IMPORTANT_: Take note of the path returned from running the generate commands so that you know exactly where the new files are.

   Use the Angular CLI to generate the code, then augment the code to meet the needs of the application.

5. If the Stack section uses Tailwind CSS, run `npx ng add tailwindcss`. After that, you do not have to do anything else, you can start using tailwind classes in your Angular application. Follow the best practices for tailwind v4 here, learn more if needed: https://tailwindcss.com/docs/upgrade-guide.
