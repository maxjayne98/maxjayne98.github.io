# Mani Khaniki — personal site

A minimal personal page about software development and artificial intelligence. Built with vanilla JavaScript and Vite. Independent of the Nuxt resume builder: separate dependencies, build, repository and deployment.

## Local

```sh
npm ci
npm run dev
npm run build
```

Local preview: http://127.0.0.1:3300

Edit contact information and introduction in `index.html`, design in `src/style.css`, and the debugging playground in `src/main.js`. The headline “Turning ideas into undefined” initially reads a missing `idea.output` property. Changing the property to `result` immediately completes the headline with “working software”, with a GSAP animation that carries the selected value from the object (or the visible local scope) into the headline. On desktop screens wider than 1050px with a mouse, only an undefined output breaks into falling letters, along with three letters from Turning ideas. A fixed-step gravity simulation gives each letter its own velocity, spin, impact restitution and friction. The initial fall waits about five seconds; selecting intent or another defined value cancels the pending fall. Selecting a valid result collects the letters into the new text. The effect is skipped on mobile and for reduced-motion preferences. Reduced-motion preferences skip the flight; new selections, scrolling, and resizing clean up an in-progress animation. Debug pauses at line 7 and opens local scope over the object declaration in the same fixed editor space; Step over resumes the paused computation. Editing a property while paused applies the change immediately. A JavaScript generator suspends the actual property lookup until resumption; no code evaluation or browser debugger is used. The editable row below intent accepts a custom key and value without a button. Duplicate and invalid keys are marked inline in red; valid values update the headline after a short typing pause. Restart clears the custom property and restores the original bug. Contact links remain accessible throughout and without JavaScript. Fonts use Google Fonts with system fallbacks.

## GitHub Pages

For your main profile website, create a repository named `maxjayne98.github.io` on the `maxjayne98` account and push this folder's contents to its `main` branch. In Settings → Pages → Build and deployment, select **GitHub Actions**. The included workflow builds and deploys `dist` automatically. The resulting URL is https://maxjayne98.github.io/ once deployment succeeds.

For a project repository instead, the same build works under a repository subpath because assets use relative URLs. Do not add the resume builder to this repository.

## Separate resume builder

The existing sibling `jayneresume` project belongs on Vercel, not GitHub Pages. Connect that repository to Vercel with the Nuxt preset. Its current PDF endpoint launches local Playwright Chromium and visits localhost; that endpoint needs a serverless-compatible browser or pre-generated PDFs before a production deployment can offer downloads. Merely deploying the current endpoint to Vercel does not make PDF downloads work. The personal page has no dependency on that server.

No production deployment is performed by creating these files.
