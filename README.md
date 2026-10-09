# Mani Khaniki — personal site

A minimal personal page about software development and artificial intelligence. Built with vanilla JavaScript and Vite. Independent of the Nuxt resume builder: separate dependencies, build, repository and deployment.

## Local

```sh
npm ci
npm run dev
npm run build
```


## GitHub Pages

For your main profile website, create a repository named `maxjayne98.github.io` on the `maxjayne98` account and push this folder's contents to its `main` branch. In Settings → Pages → Build and deployment, select **GitHub Actions**. The included workflow builds and deploys `dist` automatically. The resulting URL is https://maxjayne98.github.io/ once deployment succeeds.

For a project repository instead, the same build works under a repository subpath because assets use relative URLs. Do not add the resume builder to this repository.
